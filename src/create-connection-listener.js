import {createAuthenticationListener} from "@zingle/sftpd";

export default function createConnectionListener({userdb}) {
  return function connectionListener(client, info) {
    console.info(`sftpd: connection request -- ${info.ip}`);

    client.on("authentication", createAuthenticationListener({userdb}));
  };
}
