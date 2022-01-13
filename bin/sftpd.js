#!/usr/bin/env node

import {configure, createAdminListener, createAdminServer} from "@zingle/sftpd";

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
}
