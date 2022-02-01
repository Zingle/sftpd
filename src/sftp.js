import {timingSafeEqual} from "crypto";
import ssh from "ssh2";
import shadowVerify from "shadow-verify";
import {FTPProtocol, hash} from "@zingle/sftpd";

const {pbkdf2} = hash;

export function connectionListener({userdb, vfs}) {
  return function connectionListener(client, info) {
    console.info(`sftpd: connection request -- ${info.ip}`);

    client.on("authentication", authenticationListener({userdb}));
    client.on("ready", readyListener());
    client.on("session", sesssionListener({vfs}));
  };
}

function authenticationListener({userdb}) {
  return async function authenticationListener(ctx) {
    const client = this;
    const methods = [];
    const user = await userdb.getItem(ctx.username);

    if (user?.hash || user?.shadow) methods.push("password");
    if (user?.key) methods.push("publickey");

    if (methods.includes(ctx.method)) {
      console.info(`sftpd: authenticating with ${ctx.method} -- ${ctx.username}`);
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

function readyListener() {
  return function readyListener() {
    console.info(`sftpd: client authenticated -- ${this.username}`);
  };
}

function sesssionListener({vfs}) {
  return function sessionListener(accept, reject) {
    const client = this;
    const {username} = client;

    // ssh2 API makes is unclear if session can trigger before authentication
    // as a precaution, make sure the username is set
    if (!username) {
      return reject();
    }

    console.info(`sftpd: starting session -- ${username}`);

    accept().once("sftp", (accept, reject) => {
      console.info(`sftpd: starting SFTP session -- ${username}`);

      // create a sandboxed FS for the user
      const userVFS = vfs.subfs(username);

      // accept SFTP session and setup handler to cleanup
      const sftp = accept().on("end", function() {
        console.info(`sftpd: end of SFTP session -- ${username}`);
        this.end();
      });

      // implement FTP protocol on SFTP session by attaching listeners
      FTPProtocol.implement(sftp, userVFS);
    });
  };
}
