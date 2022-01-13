import ssh from "ssh2";
import {join, resolve} from "path";

const {utils: {sftp: {STATUS_CODE: {
  FAILURE, NO_SUCH_FILE, OK, PERMISSION_DENIED
}}}} = ssh;

export class FTPSession {
  constructor(sftp, username) {
    this.sftp = sftp;
    this.username = username;
    this.fs = {
      "/": mkdir(),
      "/files": mkdir()
    };
  }

  realpath() {
    const {sftp} = this;

    return async function REALPATH(reqid, path) {
      const filename = resolve("/", path);
      sftp.name(reqid, [{filename}]);
    }
  }

  stat() {
    const {sftp, fs} = this;

    return async function STAT(reqid, path) {
      const filename = resolve("/", path);

      if (filename in fs) {
        sftp.attrs(reqid, fs[filename]);
        console.log("STAT", fs[filename]);
      } else {
        sftp.status(reqid, NO_SUCH_FILE);
      }
    }
  }
}

function mkdir() {
  const now = Date.now();
  const mode = 700;
  const uid = 1000;
  const gid = 1000;
  const size = 0;
  const atime = parseInt(now / 1000);
  const mtime = parseInt(now / 1000);

  return {mode, uid, gid, size, atime, mtime};
}
