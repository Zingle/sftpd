import {readFileSync} from "fs";
import {DEFAULT_CONF, DEFAULT_ADMIN_PORT} from "@zingle/sftpd";
import {DEFAULT_SFTP_BANNER, DEFAULT_SFTP_PORT} from "@zingle/sftpd";

export default function configure(env, argv) {
  const config = defaults();
  const args = argv.slice(2);

  readenv(config, env);
  readargv(config, argv);

  if (config.help || config.error) {
    return config;
  }

  try {
    const file = readFileSync(config.conf, {encoding: "utf8"});
    const conf = JSON.parse(file);
    readconf(config, conf);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    console.warn(`sftpd: ENOENT -- ${config.conf}`);
  }

  return config;
}

function defaults(config={}) {
  config.conf = DEFAULT_CONF;
  config.help = false;
  config.admin = false;
  config.sftp = false;
  config.error = false;
  return config;
}

function readenv(config, env) {
  if (env.SFTPD_CONFIG) config.conf = env.SFTPD_CONFIG;
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
      config.error = new Error(`unexpected argument -- ${arg}`);
      return config;
    }
  }

  return config;
}

function readconf(config, conf) {
  if (conf.admin && conf.admin.user && conf.admin.pass) {
    const {admin: {user, pass, port}} = conf;
    config.admin = {user, pass, port: DEFAULT_ADMIN_PORT};

    if (port && Number.isInteger(Number(port)) && port > 0) {
      config.admin.port = Number(port);
    } else if (port) {
      console.warn(`sftpd: invalid admin port -- ${port}`);
      console.warn(`sftpd: using default admin port -- ${config.admin.port}`);
    }
  } else {
    console.warn(`sftpd: admin endpoint not configured`);
  }

  if (conf.sftp && conf.sftp.hostKeys && conf.sftp.hostKeys.length) {
    const {sftp: {banner, hostKeys, port}} = conf;
    config.sftp = {hostKeys, banner: DEFAULT_SFTP_BANNER, port: DEFAULT_SFTP_PORT};

    if (banner) {
      config.sftp.banner = banner;
    }

    if (port && Number.isInteger(Number(port)) && port > 0) {
      config.sftp.port = Number(port);
    } else if (port) {
      console.warn(`sftpd: invalid SFTP port -- ${port}`);
      console.warn(`sftpd: using default SFTP port -- ${config.sftp.port}`);
    }
  } else {
    console.warn(`sftpd: SFTP endpoint not configured`);
  }

  return config;
}
