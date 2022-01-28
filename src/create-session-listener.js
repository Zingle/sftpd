import {FTPProtocol, MockFS} from "@zingle/sftpd";

export default function createSesssionListener({vfs}) {
  return function sessionListener(accept, reject) {
    const client = this;
    const {username} = client;

    // ssh2 API makes is unclear if session can trigger before authentication
    // as a precaution, make sure the username is set
    if (!username) {
      return reject();
    }

    console.info(`sftpd: starting session -- ${username}`);

    accept().once("sftp", (accept, reject) => {
      console.info(`sftpd: starting SFTP session -- ${username}`);

      // create a sandboxed FS for the user
      const userVFS = vfs.subfs(username);

      // accept SFTP session and setup handler to cleanup
      const sftp = accept().on("end", function() { this.end(); });

      // implement FTP protocol on SFTP session by attaching listeners
      FTPProtocol.implement(sftp, userVFS);
    });
  };
}
