const [DIR_MODE, FILE_MODE] = [0o700, 0o600];

export class MockFS {
  constructor() {
    throw new Error("MockFS is abstract");
  }

  static get DIR_MODE()   { return DIR_MODE; }
  static get FILE_MODE()  { return FILE_MODE; }

  static mkdir() {
    const now = Date.now();
    const mode = DIR_MODE;
    const uid = 1000;
    const gid = 1000;
    const size = 0;
    const atime = parseInt(now / 1000);
    const mtime = parseInt(now / 1000);

    return {mode, uid, gid, size, atime, mtime};
  }

  static mkfile() {
    const now = Date.now();
    const mode = FILE_MODE;
    const uid = 1000;
    const gid = 1000;
    const size = 0;
    const atime = parseInt(now / 1000);
    const mtime = parseInt(now / 1000);

    return {mode, uid, gid, size, atime, mtime};
  }
}
