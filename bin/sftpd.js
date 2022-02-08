#!/usr/bin/env node

import {configure, SFTPDServer, SFTPDConsole} from "@zingle/sftpd";

start(process);

function start(process) {
  const console = SFTPDConsole.fromProcess(process);

  console.verbose = Boolean(process.env.DEBUG);

  try {
    const config = configure(process, console);

    if (config) {
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
  server.on("http:listening", port => console.info("HTTP server listening on port", port));
  server.on("sftp:listening", port => console.info("SFTP server listening on port", port));
}
