import {
  createAuthenticationListener,
  createReadyListener,
  createSesssionListener
} from "@zingle/sftpd";

export default function createConnectionListener({userdb, vfs}) {
  return function connectionListener(client, info) {
    console.info(`sftpd: connection request -- ${info.ip}`);

    client.on("authentication", createAuthenticationListener({userdb}));
    client.on("ready", createReadyListener());
    client.on("session", createSesssionListener({vfs}));
  };
}
