import {promises as fs} from "fs";
import {join, resolve} from "path";

export class VirtualFS {
  constructor(root="/") {
    this.root = root;
    this.fds = new Map();
  }

  async close(fd) {
    if (!this.isOpen(fd)) {
      throw new Error("bad file descriptor");
    }

    const fdinfo = this.fds.get(fd);
    await fdinfo.handle.close();
    fdinfo.open = false;
    fdinfo.pos = 0;
  }

  fpath(fd) {
    if (!this.isOpen(fd)) {
      throw new Error("bad file descriptor");
    }

    return this.fds.get(fd).path;
  }

  fpos(fd) {
    if (!this.isOpen(fd)) {
      throw new Error("bad file descriptor");
    }

    return this.fds.get(fd).pos;
  }

  async fstat(fd, options) {
    if (!this.isOpen(fd)) {
      throw new Error("bad file descriptor");
    }

    return await this.fds.get(fd).handle.stat();
  }

  isClosed(fd) {
    const fdinfo = this.fds.get(fd);
    return Boolean(fdinfo && !fdinfo.open);
  }

  isOpen(fd) {
    return Boolean(this.fds.get(fd)?.open);
  }

  async lstat(path) {
    const rpath = realizePath(this.root, path);
    return await fs.lstat(rpath);
  }

  async mkdir(path, recursive=false) {
    const rpath = realizePath(this.root, path);

    try {
      await fs.mkdir(rpath);
    } catch (err) {
      if (err.code === "EEXIST") {
        return;
      } else if (err.code === "ENOENT" && recursive) {
        await this.mkdir(dirname(normalizePath(path)));
        await fs.mkdir(rpath);
      } else {
        throw err;
      }
    }
  }

  async open(path, flags, mode) {
    const rpath = realizePath(this.root, path);
    const handle = await fs.open(rpath, flags, mode);
    const {fd} = handle;

    this.fds.set(fd, {
      handle,
      path: normalizePath(path),
      open: true,
      pos: 0
    });

    return fd;
  }

  async read(fd, buffer, offset, length, position) {
    if (!this.isOpen(fd)) {
      throw new Error("bad file descriptor");
    }

    const finfo = this.fds.get(fd);
    const args = [...arguments].slice(1);
    const {bytesRead} = await finfo.handle.read(...args);

    finfo.pos += bytesRead;
  }

  async readdir(path) {
    const rpath = realizePath(this.root, path);
    return await fs.readdir(rpath);
  }

  realpath(path) {
    return resolve("/", path);
  }

  async rename(fromPath, toPath) {
    const rfrom = realizePath(this.root, fromPath);
    const rto = realizePath(this.root, toPath);
    return await fs.rename(rfrom, rto);
  }

  async rmdir(path) {
    const rpath = realizePath(this.root, path);
    return await fs.rmdir(rpath);
  }

  async stat(path) {
    const rpath = realizePath(this.root, path);
    return await fs.stat(rpath);
  }

  subfs(path) {
    return new VirtualFS(realizePath(this.root, path));
  }

  async unlink(path) {
    const rpath = realizePath(this.root, path);
    return await fs.unlink(rpath);
  }

  async write(fd, buffer, offset, length, position) {
    if (!this.isOpen(fd)) {
      throw new Error("bad file descriptor");
    }

    const finfo = this.fds.get(fd);
    const args = [...arguments].slice(1);

    await finfo.handle.write(...args);

    finfo.pos = position + length;
  }
}

// return the full realized path from a virtual root and virtual path
function realizePath(vroot, vpath) {
  return join(vroot, resolve("/", vpath));
}

// process things like . and .. and ensure result is an absolute path
function normalizePath(path) {
  return resolve("/", path);
}

// return the virtualized path from a virtual root and full realized path
function virtualizePath(root, rpath) {
  if (!rpath.startsWith(root)) return null;
  return resolve("/", rpath.slice(root.length));
}
