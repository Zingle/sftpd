import ssh from "ssh2";
import {join} from "path";

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
        console.debug("<<", reqid, command, ...args);
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
}

export class FTPSession {
  constructor(sftp, fs) {
    this.sftp = sftp;
    this.fs = fs;
  }

  #send(type, reqid, data) {
    console.debug("  ", reqid, ">>", `.${type}`, data);
    this.sftp[type](reqid, data);
  }

  attrs(reqid, attrs)     { this.#send("attrs", reqid, attrs); }
  data(reqid, buffer)     { this.#send("data", reqid, buffer); }
  handle(reqid, handles)  { this.#send("handle", reqid, handles); }
  name(reqid, names)      { this.#send("name", reqid, names); }
  status(reqid, status)   { this.#send("status", reqid, status); }
}

const FTPProtocolImplementation = {
  async close(context, [fd]) {
    if (context.fs.isOpen(fd)) {
      await context.fs.close(fd);
    } else if (!context.fs.isClosed(fd)) {
      context.status(FAILURE);
    }

    context.status(OK);
  },

  async fstat(context, handle) {
    try {
      const [fd] = handle;
      const stat = await context.fs.fstat(fd);
      const {mode, uid, gid, size, atime, mtime} = stat;

      context.attrs({mode, uid, gid, size, atime, mtime});
    } catch (err) {
      context.status(FAILURE);
    }
  },

  async lstat(context, path) {
    try {
      const stat = await context.fs.lstat(path);
      const {mode, uid, gid, size, atime, mtime} = stat;

      context.attrs({mode, uid, gid, size, atime, mtime});
    } catch (err) {
      if (err.code === "ENOENT") {
        context.status(NO_SUCH_FILE);
      } else {
        context.status(FAILURE);
      }
    }
  },

  async mkdir(context, path) {
    try {
      await context.fs.mkdir(path);
      context.status(OK);
    } catch (err) {
      if (err.code === "ENOENT") {
        context.status(NO_SUCH_FILE);
      } else {
        console.error(err);
        context.status(FAILURE);
      }
    }
  },

  async open(context, path, flags, attrs) {
    try {
      const fd = await context.fs.open(path, flagsToString(flags));
      context.handle(Buffer.from([fd]));
    } catch (err) {
      if (err.code === "ENOENT") {
        context.status(NO_SUCH_FILE);
      } else {
        console.error(err);
        context.status(FAILURE);
      }
    }
  },

  async opendir(context, path) {
    try {
      const fd = await context.fs.open(path, flagsToString(READ));
      const stat = await context.fs.fstat(fd);

      if (!stat.isDirectory()) {
        await context.fs.close(fd);
        return context.status(FAILURE);
      }

      context.handle(Buffer.from([fd]));
    } catch (err) {
      if (err.code === "ENOENT") {
        context.status(NO_SUCH_FILE);
      } else {
        console.error(err);
        context.status(FAILURE);
      }
    }
  },

  // async read(...) { ... },

  async readdir(context, handle) {
    const [fd] = handle;

    if (context.fs.isClosed(fd)) {
      return context.status(EOF);
    } else if (!context.fs.isOpen(fd)) {
      return context.status(FAILURE);
    }

    const stat = await context.fs.fstat(fd);

    if (!stat.isDirectory()) {
      return context.status(FAILURE);
    }

    const dir = context.fs.fpath(fd);
    const entries = await context.fs.readdir(dir);
    const names = [];

    for (const entry of [".", "..", ...entries]) {
      const path = join(dir, entry);
      const stat = await context.fs.lstat(path);
      const type = stat.isSymbolicLink() ? "l" : (stat.isDirectory() ? "d" : "-");
      const smodes = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];
      const omode = (stat.mode & parseInt("777", 8)).toString(8);
      const smode = [...omode].map(ch => smodes[ch]).join("");
      const {mode, uid, gid, size, atime, mtime} = stat;
      const date = FTPProtocol.formatTime(new Date(mtime));
      const longname = `${type}${smode} 1 ${uid} ${gid} ${size} ${date} ${entry}`;
      const attrs = {mode, uid, gid, size, atime, mtime};
      names.push({filename: entry, longname, attrs});
    }

    await context.fs.close(fd);

    context.name(names);
  },

  async realpath(context, path) {
    const filename = context.fs.realpath(path);
    context.name([{filename}]);
  },

  async remove(context, path) {
    try {
      await context.fs.unlink(path);
      context.status(OK);
    } catch (err) {
      if (err.code === "ENOENT") {
        context.status(NO_SUCH_FILE);
      } else {
        console.error(err);
        context.status(FAILURE);
      }
    }
  },

  async rename(context, fromPath, toPath) {
    try {
      await context.fs.rename(fromPath, toPath);
      context.status(OK);
    } catch (err) {
      if (err.code === "ENOENT") {
        context.status(NO_SUCH_FILE);
      } else {
        console.error(err);
        context.status(FAILURE);
      }
    }
  },

  async rmdir(context, path) {
    try {
      await context.fs.rmdir(path);
      context.status(OK);
    } catch (err) {
      if (err.code === "ENOENT") {
        context.status(NO_SUCH_FILE);
      } else {
        console.error(err);
        context.status(FAILURE);
      }
    }
  },

  async stat(context, path) {
    try {
      const stat = await context.fs.stat(path);
      const {mode, uid, gid, size, atime, mtime} = stat;

      context.attrs({mode, uid, gid, size, atime, mtime});
    } catch (err) {
      if (err.code === "ENOENT") {
        context.status(NO_SUCH_FILE);
      } else {
        console.error(err);
        context.status(FAILURE);
      }
    }
  }

  // async write(...) { ... }
}
