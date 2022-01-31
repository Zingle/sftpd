#!/usr/bin/env node

import {Console} from "console";
import {configure} from "@zingle/sftpd";
import {createAdminServer, requestListener} from "@zingle/sftpd";
import {createSFTPServer, connectionListener} from "@zingle/sftpd";
import {VirtualFS} from "@zingle/sftpd";

const config = configure(process.env, process.argv);

if (false === launch(config)) {
  process.exit(1);
}

function launch(config) {
  const {userdb, debug} = config;

  if (!debug) {
    quiet(console);
    console.info("sftpd: set DEBUG in env for more detailed logs");
  }

  if (config.help) {
    console.log(`Usage: sftpd [<config-file>]`);
    return;
  }

  if (config.error) {
    console.error(`sftpd: ${config.error.message}`);
    return false;
  }

  if (config.admin) {
    const admin = {...config.admin, userdb};
    const {port} = admin;
    const listener = requestListener(admin);
    const server = createAdminServer(listener);

    server.listen(port, function () {
      console.info(`sftpd: admin endpoint listening on port ${port}`);
    });
  }

  if (config.sftp) {
    const vfs = new VirtualFS(config.sftp.home);
    const sftp = {...config.sftp, userdb, vfs};
    const {port} = sftp;
    const listener = connectionListener(sftp);
    const server = createSFTPServer(sftp, listener);

    server.listen(port, function() {
      console.info(`sftpd: SFTP endpoint listening on port ${port}`);
    })
  }
}

function quiet(console) {
  return Object.assign(console, {debug, error});

  function debug() {
    // ignore debug logs
  }

  function error(err) {
    const message = `sftpd: error -- ${err?.message || err}`;
    Console.prototype.error.call(console, message);
  }
}
