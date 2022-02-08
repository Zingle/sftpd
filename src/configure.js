import {readFileSync} from "fs";
import {DEFAULT_CONF, DEFAULT_ADMIN_PORT} from "@zingle/sftpd";
import {DEFAULT_SFTP_BANNER, DEFAULT_SFTP_PORT} from "@zingle/sftpd";
import {TemporaryStorage} from "@zingle/sftpd";

const globalConsole = console;

export default function configure({env, argv}, console=globalConsole) {
  const config = defaults();
  const args = argv.slice(2);

  readenv(config, env);
  readargv(config, argv);

  if (config.help) {
    console.log(`Usage: sftpd [<config-file>]`);
    return false;
  }

  if (config.error) {
    console.error(config.error);
    return false;
  }

  try {
    const file = readFileSync(config.conf, {encoding: "utf8"});
    const conf = JSON.parse(file);
    readconf(config, conf, console);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    console.warn(`ENOENT: ${config.conf}`);
  }

  return config;
}

function defaults(config={}) {
  config.conf = DEFAULT_CONF;
  config.help = false;
  config.http = false;
  config.sftp = false;
  config.error = false;
  config.userdb = new TemporaryStorage();
  config.debug = false;
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

  if (conf.http?.user && conf.http?.pass) {
    const {http: {user, pass, port}} = conf;
    config.http = {user, pass, port: DEFAULT_ADMIN_PORT};

    if (port && Number.isInteger(Number(port)) && port > 0) {
      config.http.port = Number(port);
    } else if (port) {
      console.warn(`invalid http port: ${port}`);
      console.warn(`using default http port: ${config.http.port}`);
    }
  } else {
    console.warn(`http endpoint not configured`);
  }

  if (conf.sftp?.hostKeys?.length && conf.sftp?.home) {
    const {sftp: {home, banner, hostKeys, port}} = conf;

    config.sftp = {
      hostKeys,
      home: home || process.cwd(),
      banner: DEFAULT_SFTP_BANNER,
      port: DEFAULT_SFTP_PORT
    };

    if (banner) {
      config.sftp.banner = banner;
    }

    if (port && Number.isInteger(Number(port)) && port > 0) {
      config.sftp.port = Number(port);
    } else if (port) {
      console.warn(`invalid SFTP port: ${port}`);
      console.warn(`using default SFTP port: ${config.sftp.port}`);
    }
  } else {
    console.warn(`SFTP endpoint not configured`);
  }

  return config;
}
