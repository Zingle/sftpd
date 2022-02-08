import {timingSafeEqual} from "crypto";
import ssh from "ssh2";
import shadowVerify from "shadow-verify";
import {FTPProtocol, hash} from "@zingle/sftpd";

const {pbkdf2} = hash;

export function connectionListener({sftpd, vfs}) {
  return function connectionListener(client, info) {
    client.on("authentication", authenticationListener({sftpd}));
    client.on("ready", readyListener({sftpd}));
    client.on("session", sesssionListener({sftpd, vfs}));

    sftpd.emit("connection", info.ip);
  };
}

function authenticationListener({sftpd}) {
  return async function authenticationListener(ctx) {
    const client = this;
    const methods = [];
    const user = await sftpd.userdb.getItem(ctx.username);

    if (user?.hash || user?.shadow) methods.push("password");
    if (user?.key) methods.push("publickey");

    if (methods.includes(ctx.method)) {
      sftpd.emit("authenticating", ctx.method, ctx.username);
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

function readyListener({sftpd}) {
  return function readyListener() {
    sftpd.emit("authenticated", this.username);
  };
}

function sesssionListener({sftpd, vfs}) {
  return function sessionListener(accept, reject) {
    const client = this;
    const {username} = client;

    // ssh2 API makes is unclear if session can trigger before authentication
    // as a precaution, make sure the username is set
    if (!username) {
      return reject();
    }

    sftpd.emit("ssh:session", username);

    accept().once("sftp", (accept, reject) => {
      sftpd.emit("sftp:session", username);

      // create a sandboxed FS for the user
      const userVFS = vfs.subfs(username);

      // accept SFTP session and setup handler to cleanup
      const sftp = accept().on("end", function() {
        sftpd.emit("sftp:end", username);
        this.end();
      });

      // implement FTP protocol on SFTP session by attaching listeners
      FTPProtocol.implement(sftp, userVFS);
    });
  };
}
