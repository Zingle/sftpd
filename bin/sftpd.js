#!/usr/bin/env node

import {configure} from "@zingle/sftpd";
import {createAdminListener, createAdminServer} from "@zingle/sftpd";
import {createConnectionListener, createSFTPServer} from "@zingle/sftpd";

const config = configure(process.env, process.argv);

if (false === launch(config)) {
  process.exit(1);
}

function launch(config) {
  if (config.help) {
    console.log(`Usage: sftpd [<config-file>]`);
    return;
  }

  if (config.error) {
    console.error(`sftpd: ${config.error.message}`);
    return false;
  }

  if (config.admin) {
    const {port} = config.admin;
    const listener = createAdminListener(config.admin);
    const server = createAdminServer(listener);

    server.listen(port, function () {
      console.info(`sftpd: admin endpoint listening on port ${port}`);
    });
  }

  if (config.sftp) {
    const {port} = config.sftp;
    const listener = createConnectionListener();
    const server = createSFTPServer(config.sftp, listener);

    server.listen(port, function() {
      console.info(`sftpd: SFTP endpoint listening on port ${port}`);
    })
  }
}
