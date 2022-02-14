import {Console} from "console";

export class SFTPDConsole extends Console {
  constructor(...args) {
    super(...args);
  }

  static fromProcess({stdout, stderr}) {
    return new SFTPDConsole(stdout, stderr);
  }

  debug(...args) {
    if (this.verbose) super.debug("sftpd: debug --", ...args);
  }

  info(...args) {
    super.info("sftpd:", ...args);
  }

  warn(...args) {
    super.warn("sftpd: warn --", ...args);
  }

  error(...args) {
    if (args[0] instanceof Error && !this.verbose) {
      args[0] = args[0].message;
    }

    if (args[0] instanceof Error) {
      super.error("sftpd:", ...args);
    } else {
      super.error("sftpd: error --", ...args);
    }
  }
}
