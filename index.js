export const DEFAULT_CONF = "sftpd.conf";
export const DEFAULT_CLIENT_PORT = 22;
export const DEFAULT_ADMIN_PORT = 2200;
export const DEFAULT_SFTP_BANNER = "put it in and get it out";

export {default as configure} from "./src/configure.js";
export {default as createAdminListener} from "./src/create-admin-listener.js";
export {default as createAdminServer} from "./src/create-admin-server.js";
