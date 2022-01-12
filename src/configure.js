import fs from "fs";
import {DEFAULT_CONFIG, DEFAULT_ADMIN_PORT} from "@zingle/sftpd";

export default function configure(env, argv) {
  const config = {};
  const args = argv.slice(2);

  if (args.includes("--help")) {
    config.help = true;
    return config;
  }

  const file = args[0] || env.SFTPD_CONFIG || DEFAULT_CONFIG;

  try {
    Object.assign(config, JSON.parse(fs.readFileSync(file)));

    if (config.admin && !(config.admin.user && config.admin.pass)) {
      console.warn("ignoring invalid admin; must specify user and pass");
      config.admin = false;
    }

    if (config.admin && typeof config.admin?.port !== "number") {
      console.warn(`using default admin port ${DEFAULT_ADMIN_PORT}`);
      config.admin.port = DEFAULT_ADMIN_PORT;
    }

    if (!config.admin) {
      config.admin = false;
    }

    return config;
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    console.warn(`warning ENOENT: ${file}`);
    return {};
  }
}
