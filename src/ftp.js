import {promises as fs} from "fs";
import {join, resolve} from "path";
import ssh from "ssh2";

const {utils: {sftp: {
  OPEN_MODE: {READ},
  STATUS_CODE: {EOF, FAILURE, NO_SUCH_FILE, OK, PERMISSION_DENIED},
  flagsToString
}}} = ssh;

export async function close({fds}, [fd]) {
  if (!fds.has(fd)) {
    return FAILURE;
  }

  const finfo = fds.get(fd);
  await finfo.handle.close();
  fds.delete(fd);
  return OK;
}

export async function fstat({fds}, [fd]) {
  if (!fds.has(fd)) {
    return FAILURE;
  }

  try {
    const finfo = fds.get(fd);
    const stat = await finfo.hadle.stat();
    const {mode, uid, gid, size, atime, mtime} = stat;

    return {attrs: {mode, uid, gid, size, atime, mtime}};
  } catch (err) {
    return FAILURE;
  }
}

export async function lstat({home}, path) {
  path = join(home, resolve("/", path));

  try {
    const stat = await fs.lstat(path);
    const {mode, uid, gid, size, atime, mtime} = stat;

    return {attrs: {mode, uid, gid, size, atime, mtime}};
  } catch (err) {
    if (err.code === "ENOENT") {
      return NO_SUCH_FILE;
    } else {
      return FAILURE;
    }
  }
}

export async function mkdir({home}, path) {
  path = join(home, resolve("/", path));

  try {
    await fs.mkdir(path);
    return OK;
  } catch (err) {
    if (err.code === "ENOENT") {
      return NO_SUCH_FILE;
    } else {
      console.error(err);
      return FAILURE;
    }
  }
}

export async function open({fds, home}, path, flags, attrs) {
  path = join(home, resolve("/", path));

  try {
    const handle = await fs.open(path, flagsToString(flags));
    fds.set(handle.fd, {open: true, pos: 0, path, handle});
    return {handle: Buffer.from([handle.fd])};
  } catch (err) {
    if (err.code === "ENOENT") {
      return NO_SUCH_FILE;
    } else {
      console.error(err);
      return FAILURE;
    }
  }
}

export async function opendir({fds, home}, path) {
  path = join(home, resolve("/", path));

  try {
    const handle = await fs.open(path, flagsToString(READ));
    const stat = await handle.stat();

    if (!stat.isDirectory()) {
      await handle.close();
      return FAILURE;
    }

    fds.set(handle.fd, {open: true, pos: 0, path, handle});

    return {handle: Buffer.from([handle.fd])};
  } catch (err) {
    if (err.code === "ENOENT") {
      return NO_SUCH_FILE;
    } else {
      console.error(err);
      return FAILURE;
    }
  }
}

export async function read({fds}, [fd], offset, length) {
  if (!fds.has(fd)) {
    return FAILURE;
  }

  try {
    const finfo = fds.get(fd);
    const stat = await finfo.handle.stat();

    if (offset >= stat.size) {
      return EOF;
    } else {
      const {pos} = finfo;
      const size = stat.size - pos > length ? length : stat.size - pos;
      const buffer = Buffer.alloc(size);
      const {bytesRead} = await finfo.handle.read(buffer, 0, size, offset);

      finfo.pos += bytesRead;

      return {data: buffer.slice(0, bytesRead)};
    }
  } catch (err) {
    console.error(err);
    return FAILURE;
  }
}

export async function readdir({fds}, [fd]) {
  if (!fds.has(fd)) {
    return FAILURE;
  } else if (fds.get(fd).pos) {
    //fds.delete(fd);
    return EOF;
  }

  const finfo = fds.get(fd);
  const stat = await finfo.handle.stat();

  if (!stat.isDirectory()) {
    return FAILURE;
  }

  const {path} = fds.get(fd);
  const entries = await fs.readdir(path);
  const names = [];

  for (const entry of [".", "..", ...entries]) {
    const file = join(path, entry);
    const stat = await fs.lstat(file);
    const type = stat.isSymbolicLink() ? "l" : (stat.isDirectory() ? "d" : "-");
    const smodes = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];
    const omode = (stat.mode & parseInt("777", 8)).toString(8);
    const smode = [...omode].map(ch => smodes[ch]).join("");
    const {mode, uid, gid, size, atime, mtime} = stat;
    const date = formatTime(new Date(mtime));
    const longname = `${type}${smode} 1 ${uid} ${gid} ${size} ${date} ${entry}`;
    const attrs = {mode, uid, gid, size, atime, mtime};
    names.push({filename: entry, longname, attrs});
  }

  finfo.pos = Infinity;

  await finfo.handle.close();

  return {name: names};
}

export async function realpath({home}, path) {
  const filename = resolve("/", path);
  return {name: [{filename}]};
}

export async function remove({home}, path) {
  path = join(home, resolve("/", path));

  try {
    await fs.unlink(path);
    return OK;
  } catch (err) {
    if (err.code === "ENOENT") {
      return NO_SUCH_FILE;
    } else {
      console.error(err);
      return FAILURE;
    }
  }
}

export async function rename({home}, fromPath, toPath) {
  fromPath = join(home, resolve("/", fromPath));
  toPath = join(home, resolve("/", toPath));

  try {
    await fs.rename(fromPath, toPath);
    return OK;
  } catch (err) {
    if (err.code === "ENOENT") {
      return NO_SUCH_FILE;
    } else {
      console.error(err);
      return FAILURE;
    }
  }
}

export async function rmdir({home}, path) {
  path = join(home, resolve("/", path));

  try {
    await fs.rmdir(path);
    return OK;
  } catch (err) {
    if (err.code === "ENOENT") {
      return NO_SUCH_FILE;
    } else {
      console.error(err);
      return FAILURE;
    }
  }
}

export async function stat({home}, path) {
  path = join(home, resolve("/", path));

  try {
    const stat = await fs.stat(path);
    const {mode, uid, gid, size, atime, mtime} = stat;

    return {attrs: {mode, uid, gid, size, atime, mtime}};
  } catch (err) {
    if (err.code === "ENOENT") {
      return NO_SUCH_FILE;
    } else {
      console.error(err);
      return FAILURE;
    }
  }
}

export async function write({fds}, [fd], offset, data) {
  if (!fds.has(fd)) {
    return FAILURE;
  }

  try {
    const finfo = fds.get(fd);
    await finfo.handle.write(data, 0, data.length, offset);
    return OK;
  } catch (err) {
    console.error(err);
    return FAILURE;
  }
}

function formatTime(date, now=new Date()) {
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
