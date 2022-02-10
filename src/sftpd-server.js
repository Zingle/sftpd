import {EventEmitter} from "events";
import express from "express";
import basic from "express-basic-auth";
import tlsopt from "tlsopt";
import ssh from "ssh2";
import {DEFAULT_ADMIN_PORT, DEFAULT_SFTP_PORT, DEFAULT_SFTP_BANNER} from "@zingle/sftpd";
import {VirtualFS, FTPProtocol, TemporaryStorage} from "@zingle/sftpd";
import {hash, http, url} from "@zingle/sftpd";

const {pbkdf2} = hash;

export class SFTPDServer extends EventEmitter {
  constructor({
    dir,
    userdb=new TemporaryStorage(),
    http={},
    sftp={}
  }={}) {
    super();
    this.vfs = new VirtualFS(dir);
    this.userdb = userdb;
    this.httpServer = this.#createHTTPServer(http);
    this.sftpServer = this.#createSFTPServer(sftp);
  }

  close() {
    this.httpServer.close();
    this.sftpServer.close();
  }

  #authenticationListener() {
    const server = this;

    return async function authenticationListener(ctx) {
      const client = this;
      const methods = [];
      const user = await server.userdb.getItem(ctx.username);

      if (user?.hash || user?.shadow) methods.push("password");
      if (user?.key) methods.push("publickey");

      if (methods.includes(ctx.method)) {
        server.emit("authenticating", ctx.method, ctx.username);
      } else {
        return ctx.reject(methods);
      }

      switch (ctx.method) {
        case "password":
          if (await verifyPass(ctx, user)) {
            client.username = ctx.username;
            return ctx.accept();
          } else {
            return ctx.reject(methods);
          }
        case "publickey":
          if (verifyKey(ctx, user)) {
            client.username = ctx.username;
            return ctx.accept();
          } else {
            return ctx.reject(methods);
          }
      }

      return ctx.reject(methods);

      async function verifyPass({password}, {hash, shadow}) {
        if (hash && await pbkdf2(password, hash)) {
          return true;
        } else if (!hash && shadow && shadowVerify(password, shadow)) {
          return true;
        } else {
          return false;
        }
      }

      function verifyKey(ctx, user) {
        const key = ssh.utils.parseKey(user.key);

        if (ctx.key.algo !== key.type) return false;
        if (!check(ctx.key.data, key.getPublicSSH())) return false;
        if (ctx.signature && key.verify(ctx.blob, ctx.signature) !== true) return false;

        return true;
      }

      function check(input, allowed) {
        const rejected = input.length !== allowed.length;
        const match = timingSafeEqual(input, rejected ? input : allowed);
        return match && !rejected;
      }
    }
  }

  #connectionListener() {
    const server = this;
    const authenticationListener = this.#authenticationListener();
    const readyListener = this.#readyListener();
    const sessionListener = this.#sessionListener();

    return function connectionListener(client, info) {
      client.on("authentication", authenticationListener);
      client.on("ready", readyListener);
      client.on("session", sessionListener);
      server.emit("connection", info.ip);
    };
  }

  #createHTTPServer({
    user, pass,
    port=DEFAULT_ADMIN_PORT
  }) {
    if (!user) throw new Error("http.user not configured");
    if (!pass) throw new Error("http.pass not configured");
    if (!Number.isInteger(port)) throw new Error("http.port must be integer");

    const listener = this.#requestListener({user, pass});
    const server = tlsopt.createServerSync(listener);

    server.listen(port, () => {
      this.emit("http:listening", port);
    });

    return server;
  }

  #createSFTPServer({
    home=process.cwd(),
    hostKeys,
    port=DEFAULT_SFTP_PORT,
    banner=DEFAULT_SFTP_BANNER
  }) {
    if (!home) throw new Error("sftp.home not configured");
    if (!hostKeys) throw new Error("sftp.hostKeys not configured");
    if (!Array.isArray(hostKeys)) throw new Error("sftp.hostKeys must be Array");
    if (hostKeys.length === 0) throw new Error("sftp.hostKeys is empty");
    if (!Number.isInteger(port)) throw new Error("sftp.port must be integer");

    const listener = this.#connectionListener();
    const server = new ssh.Server({banner, hostKeys}, listener);

    server.listen(port, () => {
      this.emit("sftp:listening", port);
    });

    return server;
  }

  #readyListener() {
    const server = this;

    return function readyListener() {
      server.emit("authenticated", this.username);
    };
  }

  #requestListener({user, pass}) {
    const app = express();
    const unauthorizedResponse = "Unauthorized\n";

    app.use(basic({users: {[user]: pass}, unauthorizedResponse}));
    app.use(express.json());
    app.use(url());

    app.post("/user", async (req, res) => {
      const {username, password, key, forwardURL, ...extra} = req.body;
      const uri = `/user/${username}`;
      const extras = Object.keys(extra).join(", ");

      if (!req.is("json")) return http.send415(res);
      if (!username) return http.send400(res, "username required");
      if (extras) return http.send400(res, `invalid key(s): ${extras}`);
      if (forwardURL) try { new URL(forwardURL); } catch (err) {
        return http.send400(res, "invalid forward URL");
      }

      // TODO: make this safer with locked updates
      // TODO: for now, just use primitive eventual consistency
      if (await this.userdb.getItem(username)) {
        return http.send409(res, `username already exists: ${username}`);
      }

      await this.userdb.setItem(username, {
        username, key, uri,
        hash: password ? await pbkdf2(password) : undefined,
        forwardURL: forwardURL ? new URL(forwardURL) : undefined
      });

      http.send303(res, new URL(uri, req.fullURL));
    });

    app.get("/user/:username", async (req, res) => {
      const {username} = req.params;
      const user = await this.userdb.getItem(username);

      if (!user) return http.send404(res);

      res.json(user);
    });

    // setup fallback handlers
    app.all("/user", http.http405("POST"));
    app.all("/user/:username", http.http405("GET"));
    app.all("*", http.http404());
    app.use(http.errorHandler());

    return app;
  }

  #sessionListener() {
    const server = this;

    return function sessionListener(accept, reject) {
      const client = this;
      const {username} = client;

      // ssh2 API makes is unclear if session can trigger before authentication
      // as a precaution, make sure the username is set
      if (!username) {
        return reject();
      }

      server.emit("ssh:session", username);

      accept().once("sftp", (accept, reject) => {
        server.emit("sftp:session", username);

        // create a sandboxed FS for the user
        const userVFS = server.vfs.subfs(username);

        // accept SFTP session and setup handler to cleanup
        const sftp = accept().on("end", function() {
          server.emit("sftp:end", username);
          this.end();
        });

        // implement FTP protocol on SFTP session by attaching listeners
        const impl = FTPProtocol.implement(sftp, userVFS);

        impl.on("send", (...args) => server.emit("ftp:send", ...args));
        impl.on("receive", (...args) => server.emit("ftp:receive", ...args));
      });
    };
  }
}
