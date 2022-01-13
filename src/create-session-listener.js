import {FTPSession} from "@zingle/sftpd";

export default function createSesssionListener() {
  return function sessionListener(accept, reject) {
    const client = this;
    const {username} = client;

    // ssh2 API makes is unclear if session can trigger before authentication
    // as a precaution, make sure the username is set
    if (!username) return reject();

    console.info(`sftpd: starting session -- ${username}`);

    accept().once("sftp", (accept, reject) => {
      console.info(`sftpd: starting SFTP session -- ${username}`);

      const sftp = accept();
      const session = new FTPSession(sftp, username);

      sftp.on("REALPATH", session.realpath());
      sftp.on("STAT", session.stat());
    });
  };
}
