#!/usr/bin/env node

import {configure} from "@zingle/sftpd";
import {createAdminListener, createAdminServer} from "@zingle/sftpd";
import {createConnectionListener, createSFTPServer} from "@zingle/sftpd";

const config = configure(process.env, process.argv);

if (false === launch(config)) {
  process.exit(1);
}

function launch(config) {
  const {userdb} = config;

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
    const listener = createAdminListener(admin);
    const server = createAdminServer(listener);

    server.listen(port, function () {
      console.info(`sftpd: admin endpoint listening on port ${port}`);
    });
  }

  if (config.sftp) {
    const sftp = {...config.sftp, userdb};
    const {port} = sftp;
    const listener = createConnectionListener();
    const server = createSFTPServer(sftp, listener);

    server.listen(port, function() {
      console.info(`sftpd: SFTP endpoint listening on port ${port}`);
    })
  }
}
