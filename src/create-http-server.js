import tlsopt from "tlsopt";

export default function createHTTPServer(listener) {
  const server = tlsopt.createServerSync(listener);
  return server;
}
