import {readFileSync} from "fs";

export const DEFAULT_CONF = "sftpd.conf";
export const DEFAULT_HTTP_PORT = 2200;
export const DEFAULT_SFTP_PORT = 22;
export const DEFAULT_SFTP_BANNER = "PUT it in and GET it out";

export function read({env, argv}) {
  let path = null;

  for (const arg of argv.slice(2)) {
    if (arg === "--help") {
      console.log(`Usage: sftpd [<conf-file>]`);
      return false;
    } else if (arg === "--") {
      break;
    } else if (!path) {
      path = arg;
    } else {
      throw new Error(`unexpected argument: ${arg}`);
    }
  }

  path = path || env.SFTPD_CONFIG || DEFAULT_CONF;

  const file = readFileSync(path, {encoding: "utf8"});
  const config = JSON.parse(file);

  return validateConfig(config);
}

function validateConfig(config) {
  let {dir, http, sftp, forward, ...unknown} = config;

  validateEmpty(unknown);

  dir = dir || process.cwd();
  http = validateHTTPConfig(http);
  sftp = validateSFTPConfig(sftp);
  forward = validateForwardConfig(forward);

  return {dir, http, sftp, forward};
}

function validateEmpty(object, context="") {
  const keys = object ? Object.keys(object) : [];

  if (keys.length) {
    const key = context ? `${context}.${keys[0]}` : keys[0];
    throw new Error(`unrecognized configuration key: ${key}`);
  }

  return object;
}

function validateHTTPConfig(http) {
  if (!http) throw new Error("missing HTTP configuration");

  let {user, pass, port, ...empty} = http;

  validateEmpty(empty, "http");

  if (!port) port = DEFAULT_HTTP_PORT;
  if (!user) throw new Error("missing HTTP user");
  if (!pass) throw new Error("missing HTTP pass");
  if (!Number.isInteger(port)) throw new Error("invalid HTTP port");
  if (port < 0) throw new Error("invalid HTTP port");

  return {user, pass, port};
}

function validateSFTPConfig(sftp) {
  if (!sftp) throw new Error("missing SFTP configuration");

  let {hostKeys, banner, port, ...empty} = sftp;

  validateEmpty(empty, "sftp");

  if (!port) port = DEFAULT_SFTP_PORT;
  if (!banner) banner = DEFAULT_SFTP_BANNER;
  if (!hostKeys) throw new Error("missing SFTP host keys");
  if (!Array.isArray(hostKeys)) throw new Error("invalid SFTP host keys");
  if (!hostKeys.length) throw new Error("missing SFTP host keys");
  if (!Number.isInteger(port)) throw new Error("invalid SFTP port");
  if (port < 0) throw new Error("invalid SFTP port");

  hostKeys = [...hostKeys];
  return {hostKeys, banner, port};
}

function validateForwardConfig(forward={}) {
  const config = {};
  const {wait} = forward;

  if (wait !== undefined) {
    if (!Number.isInteger(wait)) throw new Error("invalid forward wait");
    if (wait < 0) throw new Error("invalid forward wait");
    config.wait = wait;
  }

  return config;
}
