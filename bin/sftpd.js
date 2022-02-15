#!/usr/bin/env node

import {join} from "path";
import tlsopt from "tlsopt";
import ssh from "ssh2";
import {open} from "sqlite";
import Sqlite3 from "sqlite3";
import {Sqlite3Storage} from "@zingle/sftpd";
import {patchConsole, readConfig} from "@zingle/sftpd";
import {requestListener, connectionListener} from "@zingle/sftpd";
import {task, forwarder} from "@zingle/sftpd";

if (!await start(process)) {
  console.error("SFTPD failed to start");
  process.exit(1);
}

async function start(process) {
  try {
    patchConsole(process);

    const config = readConfig(process);
    const home = config.dir;
    const root = config.dir;
    const userdb = await makeStorage(root);
    const httpServer = makeHTTPServer({...config.http, userdb});
    const sftpServer = makeSFTPServer({...config.sftp, userdb, home});
    const forwarder = makeForwarder({...config.forward, userdb, root});

    httpServer.listen(config.http.port);
    sftpServer.listen(config.sftp.port);
    forwarder.start();

    process.on("SIGTERM", () => {
      console.info("shutting down after receiving SIGTERM");
      httpServer.close();
      sftpServer.close();
      forwarder.stop();
    });

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

function makeForwarder({root, userdb, wait}) {
  const forward = forwarder({root, userdb, wait});
  return task(forward);
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

async function makeStorage(dir) {
  const filename = join(dir, "user.db");
  const driver = Sqlite3.Database;
  const db = await open({filename, driver});

  await Sqlite3Storage.initialize(db);

  return new Sqlite3Storage(db);
}
