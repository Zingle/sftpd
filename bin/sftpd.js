#!/usr/bin/env node

import tlsopt from "tlsopt";
import ssh from "ssh2";
import {TemporaryStorage} from "@zingle/sftpd";
import {patchConsole, readConfig} from "@zingle/sftpd";
import {requestListener, connectionListener} from "@zingle/sftpd";

if (!start(process)) {
  console.error("SFTPD failed to start");
  process.exit(1);
}

function start(process) {
  try {
    patchConsole(process);

    const config = readConfig(process);
    const userdb = new TemporaryStorage();
    const home = config.dir;
    const httpServer = makeHTTPServer({...config.http, userdb});
    const sftpServer = makeSFTPServer({...config.sftp, userdb, home});

    httpServer.listen(config.http.port);
    sftpServer.listen(config.sftp.port);

    process.on("SIGTERM", () => {
      console.info("shutting down after receiving SIGTERM");
      httpServer.close();
      sftpServer.close();
    });

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

function makeHTTPServer({user, pass, userdb}) {
  const listener = requestListener({user, pass, userdb});
  const server = tlsopt.createServerSync(listener);

  server.on("listening", () => {
    const {port} = server.address();
    console.info("HTTP server listening on port", port);
  });

  return server;
}

function makeSFTPServer({hostKeys, banner, userdb, home}) {
  const listener = connectionListener({userdb, home});
  const server = new ssh.Server({banner, hostKeys}, listener);

  server.on("listening", () => {
    const {port} = server.address();
    console.info("SFTP server listening on port", port);
  });

  return server;
}
