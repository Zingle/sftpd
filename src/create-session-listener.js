export default function createSesssionListener() {
  return function sessionListener(accept, reject) {
    // ssh2 API makes is unclear if session can trigger before authentication
    // as a precaution, make sure the username is set
    if (!this.username) return reject();

    console.info(`sftpd: starting session -- ${this.username}`);

    accept().once("sftp", (accept, reject) => {
      console.info(`sftpd: starting SFTP session -- ${this.username}`);

      accept();
    });
  };
}
