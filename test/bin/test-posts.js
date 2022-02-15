#!/usr/bin/env node

import createPostServer from "../lib/post-server.js";

const server = createPostServer();

server.listen(function() {
  const {port} = this.address();
  console.info(`listening on http://localhost:${port}/`);
});
