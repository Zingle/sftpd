#!/usr/bin/env node

import express from "express";
import tlsopt from "tlsopt";
import {configure} from "@zingle/sftpd";

launch(configure(process.env, process.argv));

function launch(config) {
  if (config.help) {
    console.log(`Usage: sftpd [<config-file>]`);
    return;
  }

  if (config.admin) {
    console.info("enabling admin endpoint");

    const app = express();
    const server = tlsopt.createServerSync(app);

    server.listen(config.admin.port, function () {
      const {port} = this.address();
      console.info(`admin listening on ${port}`);
    });
  }
}
