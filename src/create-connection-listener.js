import {createAuthenticationListener} from "@zingle/sftpd";

export default function createConnectionListener() {
  return function connectionListener(client, info) {
    console.info(`sftpd: connection request from ${info.ip}`);

    client.on("authentication", createAuthenticationListener());
  };
}
