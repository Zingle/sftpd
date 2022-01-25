import ssh from "ssh2";
import {join, resolve} from "path";
import {MockFS} from "@zingle/sftpd";

const {utils: {sftp: {
  OPEN_MODE: {READ},
  STATUS_CODE: {FAILURE, NO_SUCH_FILE, OK, PERMISSION_DENIED},
  flagsToString
}}} = ssh;

export class FTPProtocol {
  constructor() {
    throw new Error("abstract class FTPProtocol cannot be constructed");
  }

  static implement(sftp, fs) {
    const session = new FTPSession(sftp, fs);

    Object.entries(FTPProtocolImplementation).forEach(([name, method]) => {
      const command = name.toUpperCase();

      sftp.on(command, (reqid, ...args) => {
        const context = new FTPRequestContext(command, session, reqid, ...args);
        method(...context);
      });
    });
  }
}

export class FTPRequestContext {
  constructor(command, session, reqid, ...args) {
    this.command = command;
    this.session = session;
    this.reqid = reqid;
    this.args = args;
    this.handles = [];
  }

  get fs()        { return this.session.fs; }

  *[Symbol.iterator]() {
    yield* [this, ...this.args];
  }

  attrs(attrs)    { this.session.attrs(this.reqid, attrs); }
  data(buffer)    { this.session.data(this.reqid, buffer); }
  handle(handles) { this.session.handle(this.reqid, handles); }
  name(names)     { this.session.name(this.reqid, names); }
  status(status)  { this.session.status(this.reqid, status); }

  async open(path, flags, attrs) {
    flags = flagsToString(flags);

    const filepath = resolve("/", path);
    const exists = filepath in this.fs;

    if (flags !== "w" && !exists) throw NO_SUCH_FILE;
    if (!exists) this.fs[filepath] = MockFS.mkfile();

    const stat = this.fs[filepath];

    this.handles.push({filepath, flags, stat, pos: 0});

    return this.handles.length - 1;
  }
}

export class FTPSession {
  constructor(sftp, fs) {
    this.sftp = sftp;
    this.fs = fs;
  }

  attrs(reqid, attrs)      { this.sftp.attrs(reqid, attrs); }
  data(reqid, buffer)      { this.sftp.data(reqid, buffer); }
  handle(reqid, handles)   { this.sftp.handle(reqid, handles); }
  name(reqid, names)       { this.sftp.name(reqid, names); }
  status(reqid, status)    { this.sftp.status(reqid, status); }
}

const FTPProtocolImplementation = {
  async open(context, path, flags, attrs) {
    try {
      const fd = await context.open(path, flags, attrs);
      context.handle(Buffer.from([fd]));
    } catch (err) {
      if (Number.isInteger(err)) {
        context.status(err);
      } else {
        console.error(err);
        context.status(FAILURE);
      }
    }
  },

  async opendir(context, path) {
    const filename = resolve("/", path);
    const {open} = FTPProtocolImplementation;

    switch (context.fs[filename]?.mode) {
      case MockFS.DIR_MODE:   open(context, path, READ, null); break;
      case MockFS.FILE_MODE:  context.status(FAILURE); break;
      default:                context.status(NO_SUCH_FILE); break;
    }
  },

  async realpath(context, path) {
    const filename = resolve("/", path);
    context.name([{filename}]);
  },

  async stat(context, path) {
    const filename = resolve("/", path);

    if (filename in context.fs) {
      context.attrs(context.fs[filename]);
    } else {
      context.status(NO_SUCH_FILE);
    }
  }
}
