import {readFileSync} from "fs";
import {DEFAULT_CONF, DEFAULT_ADMIN_PORT} from "@zingle/sftpd";
import {DEFAULT_SFTP_BANNER, DEFAULT_SFTP_PORT} from "@zingle/sftpd";

const globalConsole = console;

export default function configure({env, argv}, console=globalConsole) {
  const config = defaults();

  if (env.SFTPD_CONFIG) config.conf = env.SFTPD_CONFIG;
  if (env.DEBUG) config.debug = true;

  readargv(config, argv);

  if (config.help) {
    console.log(`Usage: sftpd [--help] [<conf-file>]`);
    return false;
  }

  try {
    const file = readFileSync(config.conf, {encoding: "utf8"});
    const conf = JSON.parse(file);
    readconf(config, conf, console);
  } catch (err) {
    config.error = err;
  }

  return config;
}

function defaults(config={}) {
  config.conf = DEFAULT_CONF;
  config.dir = process.cwd();
  config.help = false;
  config.debug = false;
  config.error = null;
  return config;
}

function readenv(config, env) {
  if (env.SFTPD_CONFIG) config.conf = env.SFTPD_CONFIG;
  if (env.DEBUG) config.debug = true;
  return config;
}

function readargv(config, argv) {
  const args = argv.slice(2);
  let file = null;

  for (const arg of args) {
    if (arg === "--help") {
      config.help = true;
    } else if (arg === "--") {
      return config;
    } else if (!file) {
      config.conf = file = arg;
    } else {
      config.error = new Error(`unexpected argument: ${arg}`);
      return config;
    }
  }

  return config;
}

function readconf(config, conf, console) {
  if (conf.debug) {
    config.debug = true;
  }

  if (conf.dir) {
    config.dir = conf.dir;
  }

  if (conf.http) {
    if (conf.http.user && conf.http.pass) {
      const {http: {user, pass, port}} = conf;
      config.http = {user, pass, port: DEFAULT_ADMIN_PORT};

      if (port && Number.isInteger(port) && port > 0) {
        config.http.port = port;
      } else if (port) {
        config.error = new Error("http port is invalid");
      }
    } else if (conf.http.user) {
      config.error = new Error("http pass not configured");
    } else {
      config.error = new Error("http user not configured");
    }
  } else {
    config.error = new Error("http endpoint not configured");
  }

  if (conf.sftp) {
    if (conf.sftp.hostKeys?.length) {
      const {sftp: {hostKeys, port, banner}} = conf;

      config.sftp = {
        hostKeys,
        banner: DEFAULT_SFTP_BANNER, port: DEFAULT_SFTP_PORT
      };

      if (banner) config.sftp.banner = banner;

      if (port && Number.isInteger(port) && port > 0) {
        config.sftp.port = port;
      } else if (port) {
        config.error = new Error("sftp port is invalid");
      }
    } else {
      config.error = new Error("sftp host keys not configured");
    }
  } else {
    config.error = new Error("sftp endpoint not configured");
  }

  return config;
}
