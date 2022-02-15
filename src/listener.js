import {join} from "path";
import express from "express";
import basic from "express-basic-auth";
import {ftp, http, pbkdf2, fullURL} from "@zingle/sftpd";
import {verifyKey, verifyPass} from "@zingle/sftpd";

function authenticationListener({userdb}) {
  return async function authenticationListener(ctx) {
    const client = this;
    const methods = [];
    const user = await userdb.getItem(ctx.username);

    if (user?.hash || user?.shadow) methods.push("password");
    if (user?.key) methods.push("publickey");

    if (methods.includes(ctx.method)) {
      console.info("authenticating with", ctx.method, "--", ctx.username);
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
        if (verifyKey(ctx, user.key)) {
          client.username = ctx.username;
          return ctx.accept();
        } else {
          return ctx.reject(methods);
        }
    }

    return ctx.reject(methods);
  }
}

function commandListener(method, {sftp, home, fds}) {
  const command = method.name.toUpperCase();

  return async function commandListener(reqid, ...args) {
    console.debug("<<", reqid, command, args);

    const result = await method({command, sftp, home, fds, reqid}, ...args);

    if (typeof result === "number") {
      console.debug("  ", reqid, ">>", ".status", result);
      sftp.status(reqid, result);
    } else {
      const type = Object.keys(result)[0];
      console.debug("  ", reqid, ">>", `.${type}`, result[type]);
      sftp[type](reqid, result[type]);
    }
  }
}

function commandListeners({sftp, home, fds}) {
  const listeners = {};

  for (const method of Object.values(ftp)) {
    const command = method.name.toUpperCase();
    listeners[command] = commandListener(method, {sftp, home, fds});
  }

  return listeners;
}

export function connectionListener({userdb, home}) {
  return function connectionListener(client, info) {
    client.on("authentication", authenticationListener({userdb}));
    client.on("ready", readyListener());
    client.on("session", sessionListener({home}));
    console.info("connection request --", info.ip);
  };
}

function readyListener() {
  return function readyListener() {
    const client = this;
    console.info("authenticated --", client.username);
  };
}

export function requestListener({user, pass, userdb}) {
  const app = express();
  const unauthorizedResponse = "Unauthorized\n";

  app.use(basic({users: {[user]: pass}, unauthorizedResponse}));
  app.use(express.json());

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
    if (await userdb.getItem(username)) {
      return http.send409(res, `username already exists: ${username}`);
    }

    await userdb.setItem(username, {
      username, key, uri,
      hash: password ? await pbkdf2(password) : undefined,
      forwardURL: forwardURL ? new URL(forwardURL) : undefined
    });

    http.send303(res, new URL(uri, fullURL(req)));
  });

  app.get("/user/:username", async (req, res) => {
    const {username} = req.params;
    const user = await userdb.getItem(username);

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

function sessionListener({home}) {
  return function sessionListener(accept, reject) {
    const client = this;
    const {username} = client;

    // ssh2 API makes is unclear if session can trigger before authentication
    // as a precaution, make sure the username is set
    if (!username) {
      return reject();
    }

    console.info("starting session --", username);

    accept().once("sftp", (accept, reject) => {
      console.info("starting SFTP session --", username);

      const sftp = accept();

      sftp.on("end", function() {
        console.info("end of SFTP session --", username);
        this.end();
      });

      home = join(home, username);

      const listeners = commandListeners({
        sftp, home, fds: new Map()
      });

      for (const [command, listener] of Object.entries(listeners)) {
        sftp.on(command, listener);
      }
    });
  };
}
