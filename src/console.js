import {Console} from "console";

const globalConsole = console;

export function patch({env, argv}, console=globalConsole) {
  const {prototype} = Console;
  const verbose = Boolean(env.DEBUG);

  return Object.assign(console, {debug, info, warn, error});

  function debug(...args) {
    if (verbose) {
      prototype.debug.call(console, "sftpd: debug --", ...args);
    }
  }

  function info(...args) {
    prototype.info.call(console, "sftpd: info --", ...args);
  }

  function warn(...args) {
    prototype.warn.call(console, "sftpd: warn --", ...args);
  }

  function error(...args) {
    if (args[0] instanceof Error && !verbose) {
      args[0] = args[0].message;
    }

    if (args[0] instanceof Error) {
      prototype.error.call(console, "sftpd:", ...args);
    } else {
      prototype.error.call(console, "sftpd: error --", ...args);
    }
  }
}
