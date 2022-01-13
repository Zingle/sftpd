import {readFileSync} from "fs";
import {DEFAULT_CONF, DEFAULT_ADMIN_PORT} from "@zingle/sftpd";

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
  config.ssh = false;
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

    if (port && isInteger(Number(port)) && port > 0) {
      config.admin.port = Number(port);
    } else if (port) {
      console.warn(`sftpd: invalid admin port -- ${port}`);
      console.warn(`sftpd: using default port -- ${config.admin.port}`);
    }
  } else {
    console.warn(`sftpd: admin endpoint not configured`);
  }

  return config;
}
