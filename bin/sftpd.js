#!/usr/bin/env node

import express from "express";
import tlsopt from "tlsopt";
import {DEFAULT_CONFIG_PORT} from "@zingle/sftpd";

const app = express();
const server = tlsopt.createServerSync(app);
const port = process.env.SFTPD_CONFIG_PORT || DEFAULT_CONFIG_PORT;

server.listen(function () {
  const {port} = this.address();
  console.info(`listening on ${port}`);
});
