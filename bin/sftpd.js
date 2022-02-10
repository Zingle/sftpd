#!/usr/bin/env node

import {configure, SFTPDServer, SFTPDConsole} from "@zingle/sftpd";

start(process);

function start(process) {
  const console = SFTPDConsole.fromProcess(process);

  console.verbose = Boolean(process.env.DEBUG);

  try {
    const config = configure(process, console);

    if (config && config.error) {
      throw config.error;
    } else if (config) {
      const server = new SFTPDServer(config);

      attachConsole(server, console);

      process.on("SIGTERM", () => {
        console.info("shutting down after receiving SIGTERM");
        server.close();
      });
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

function attachConsole(server, console) {
  server.on("error", err => console.error(err));
  server.on("http:listening", port => console.info("HTTP server listening --", port));
  server.on("sftp:listening", port => console.info("SFTP server listening --", port));
  server.on("connection", ip => console.info("connection request --", ip));
  server.on("authenticating", (method, user) => console.info("authenticating with", method, "--", user));
  server.on("ssh:session", user => console.info("starting session --", user));
  server.on("sftp:session", user => console.info("starting SFTP session --", user));
  server.on("sftp:end", user => console.info("end of SFTP session --", user));
  server.on("ftp:receive", (cmd, reqid, data) => console.debug("<<", reqid, cmd, data));
  server.on("ftp:send", (type, reqid, data) => console.debug("  ", reqid, ">>", `.${type}`, data));
}
