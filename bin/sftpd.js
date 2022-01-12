#!/usr/bin/env node

import tlsopt from "tlsopt";
import express from "express";
import basic from "express-basic-auth";
import {configure} from "@zingle/sftpd";

launch(configure(process.env, process.argv));

function launch(config) {
  if (config.help) {
    console.log(`Usage: sftpd [<config-file>]`);
    return;
  }

  if (config.admin) {
    const {admin: {user, pass, port}} = config;
    const app = express();
    const server = tlsopt.createServerSync(app);

    app.use(basic({users: {[user]: pass}}));

    console.info(`enabling admin endpoint on port ${port}`);

    server.listen(port, function () {
      const {port} = this.address();
    });
  }
}
