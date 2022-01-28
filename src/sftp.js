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

    if (user?.hash) methods.push("password");
    if (user?.key) methods.push("key");

    if (methods.includes(ctx.method)) {
      console.info(`sftpd: authenticating with ${ctx.method} -- ${ctx.username}`);
    } else {
      return ctx.reject(methods);
    }

    switch (ctx.method) {
      case "password":
        if (await pbkdf2(ctx.password, user.hash)) {
          client.username = ctx.username;
          return ctx.accept();
        } else {
          return ctx.reject(methods);
        }
    }

    return ctx.reject(methods);
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
