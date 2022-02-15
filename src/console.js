import {Console} from "console";

const globalConsole = console;

export function patch({env, argv}, console=globalConsole) {
  const {prototype} = Console;
  const verbose = Boolean(env.DEBUG);

  return Object.assign(console, {debug, info, warn, error});

  function debug(...args) {
    if (verbose) {
      prototype.debug.call(console, "[DBUG]", ...args);
    }
  }

  function info(...args) {
    if (verbose) {
      prototype.info.call(console, "[INFO]", ...args);

    } else {
      prototype.info.call(console, ...args);
    }
  }

  function warn(...args) {
    prototype.warn.call(console, "[WARN]", ...args);
  }

  function error(...args) {
    if (args[0] instanceof Error && !verbose) {
      args[0] = args[0].message;
    }

    if (args[0] instanceof Error) {
      prototype.error.call(console, ...args);
    } else {
      prototype.error.call(console, "[ERRO]", ...args);
    }
  }
}
