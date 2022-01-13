import tlsopt from "tlsopt";

export default function createAdminServer(listener) {
  const server = tlsopt.createServerSync(listener);
  return server;
}
