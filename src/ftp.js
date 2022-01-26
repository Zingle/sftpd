import ssh from "ssh2";
import {join, resolve} from "path";
import {MockFS} from "@zingle/sftpd";

const {utils: {sftp: {
  OPEN_MODE: {READ},
  STATUS_CODE: {EOF, FAILURE, NO_SUCH_FILE, OK, PERMISSION_DENIED},
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

  static formatTime(date, now=new Date()) {
    const year = date.getFullYear();
    const month = date.toLocaleString("default", {month: "short"});
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const cutoff = new Date(now);

    cutoff.setFullYear(cutoff.getFullYear() - 1);

    if (date > cutoff) {
      return `${month} ${day} ${hour}:${minute}`;
    } else {
      return `${month} ${day} ${year}`;
    }
  }
}

export class FTPRequestContext {
  constructor(command, session, reqid, ...args) {
    this.command = command;
    this.session = session;
    this.reqid = reqid;
    this.args = args;
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

  async close(handle) {
    await this.session.close(handle);
  }

  finfo(handle) {
    return this.session.finfo(handle);
  }

  async open(path, flags, attrs) {
    const handle = await this.session.open(path, flags, attrs);
    return handle;
  }
}

export class FTPSession {
  constructor(sftp, fs) {
    this.sftp = sftp;
    this.fs = fs;
    this.handles = [];
  }

  attrs(reqid, attrs)      { this.sftp.attrs(reqid, attrs); }
  data(reqid, buffer)      { this.sftp.data(reqid, buffer); }
  handle(reqid, handles)   { this.sftp.handle(reqid, handles); }
  name(reqid, names)       { this.sftp.name(reqid, names); }
  status(reqid, status)    { this.sftp.status(reqid, status); }

  async open(path, flags, attrs) {
    flags = flagsToString(flags);

    const filepath = resolve("/", path);
    const exists = filepath in this.fs;

    if (flags !== "w" && !exists) throw NO_SUCH_FILE;
    if (!exists) this.fs[filepath] = MockFS.mkfile();

    const stat = this.fs[filepath];
    const open = true;
    const pos = 0;

    return this.handles.push({filepath, flags, stat, pos, open});
  }

  async close(handle) {
    if (this.handles[handle-1]?.open) {
      this.handles[handle-1] = null;
    }
  }

  finfo(handle) {
    return this.handles[handle-1];
  }
}

const FTPProtocolImplementation = {
  async close(context, [fd]) {
    await context.close(fd);
    context.status(OK);
  },

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

  async readdir(context, handle) {
    const file = context.finfo(handle[0]);

    if (!file) {
      return context.status(FAILURE);
    } else if (file.open !== true) {
      return context.status(EOF);
    }

    const {filepath} = file;
    const names = [];

    for (const path in context.fs) {
      const relpath = filepath.endsWith("/")
        ? path.slice(filepath.length)
        : path.slice(filepath.length+1);

      if (path === filepath) continue;
      if (!path.startsWith(filepath) || relpath.includes("/")) continue;

      names.push(ls(filepath, relpath, context.fs[path]))
    }

    file.open = false;
    context.name(names);

    function ls(filepath, entry, {uid, gid, mode, atime, mtime, size}) {
      const smodes = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];
      const omode = (mode & parseInt("777", 8)).toString(8);
      const smode = [...omode].map(ch => smodes[ch]).join("");
      const type = mode === MockFS.DIR_MODE ? "d" : "-";
      const date = FTPProtocol.formatTime(new Date(mtime));
      const longname = `${type}${smode} 1 ${uid} ${gid} ${size} ${date} ${entry}`;
      const attrs = {mode, uid, gid, size, atime, mtime};
      const filename = entry;
      return {filename, longname, attrs};
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
