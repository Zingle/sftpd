import {EventEmitter} from "events";
import {DEFAULT_ADMIN_PORT, DEFAULT_SFTP_PORT, DEFAULT_SFTP_BANNER} from "@zingle/sftpd";
import {createHTTPServer, createSFTPServer} from "@zingle/sftpd";
import {connectionListener, requestListener} from "@zingle/sftpd";
import {VirtualFS} from "@zingle/sftpd";

export class SFTPDServer extends EventEmitter {
  constructor({
    userdb=new TemporaryStorage(),
    http={},
    sftp={}
  }={}) {
    super();
    this.userdb = userdb;
    this.httpServer = this.#createHTTPServer(http);
    this.sftpServer = this.#createSFTPServer(sftp);
  }

  close() {
    this.httpServer.close();
    this.sftpServer.close();
  }

  #createHTTPServer({
    user, pass,
    port=DEFAULT_ADMIN_PORT
  }) {
    if (!user) throw new Error("http.user not configured");
    if (!pass) throw new Error("http.pass not configured");
    if (!Number.isInteger(port)) throw new Error("http.port must be integer");

    const {userdb} = this;
    const listener = requestListener({user, pass, userdb});
    const server = createHTTPServer(listener);

    server.listen(port, () => {
      this.emit("http:listening", port);
    });

    return server;
  }

  #createSFTPServer({
    home=process.cwd(),
    hostKeys,
    port=DEFAULT_SFTP_PORT,
    banner=DEFAULT_SFTP_BANNER
  }) {
    if (!home) throw new Error("sftp.home not configured");
    if (!hostKeys) throw new Error("sftp.hostKeys not configured");
    if (!Array.isArray(hostKeys)) throw new Error("sftp.hostKeys must be Array");
    if (hostKeys.length === 0) throw new Error("sftp.hostKeys is empty");
    if (!Number.isInteger(port)) throw new Error("sftp.port must be integer");

    const {userdb} = this;
    const vfs = new VirtualFS(home);
    const listener = connectionListener({userdb, vfs});
    const server = createSFTPServer({home, hostKeys, banner}, listener);

    server.listen(port, () => {
      this.emit("sftp:listening", port);
    });

    return server;
  }
}
