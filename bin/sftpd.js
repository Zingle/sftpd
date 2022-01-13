#!/usr/bin/env node

import tlsopt from "tlsopt";
import express from "express";
import basic from "express-basic-auth";
import {configure} from "@zingle/sftpd";

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
    const {admin: {user, pass, port}} = config;
    const app = express();
    const server = tlsopt.createServerSync(app);

    app.use(basic({users: {[user]: pass}}));

    console.info(`sftpd: admin endpoint listening on port ${port}`);

    server.listen(port, function () {
      const {port} = this.address();
    });
  }
}
