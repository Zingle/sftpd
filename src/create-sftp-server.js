import ssh from "ssh2";

export default function createSFTPServer({banner, hostKeys}, connectionListener) {
  const server = new ssh.Server({banner, hostKeys}, connectionListener);
  return server;
}
