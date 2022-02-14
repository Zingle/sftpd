import expect from "expect.js";
import mockfs from "mock-fs";
import {VirtualFS} from "@zingle/sftpd";

describe("VirtualFS", () => {
  let vfs;

  beforeEach(async () => {
    vfs = new VirtualFS("dir");

    mockfs({
      file: "root",
      dir: {file: "dir", sub: {subfile: "sub"}},
    });
  });

  afterEach(() => {
    mockfs.restore();
  });

  describe("working with file descriptors", () => {
    let fd;

    beforeEach(async () => {
      fd = await vfs.open("file");
    });

    afterEach(async () => {
      if (vfs.isOpen(fd)) await vfs.close(fd);
    });

    describe(".isOpen/.isClosed(fd)", () => {
      it("should return false for unknown file descriptor", async () => {
        expect(vfs.isOpen(1)).to.be(false);
        expect(vfs.isClosed(1)).to.be(false);
      });
    });

    describe(".open(path, flags, mode)", () => {
      it("should return open file descriptor", async () => {
        expect(vfs.isOpen(fd)).to.be(true);
      });
    });

    describe(".close(fd)", () => {
      it("should close open file descriptor", async () => {
        await vfs.close(fd);
        expect(vfs.isClosed(fd)).to.be(true);
      });
    });

    describe(".fpos(fd)", () => {
      it("should return position from open file descriptor", async () => {
        expect(vfs.fpos(fd)).to.be(0);
      });
    });

    describe(".read(fd, buffer, offset, length, position)", () => {
      it("should read file into buffer and update position", async () => {
        const buffer = Buffer.alloc(4);

        await vfs.read(fd, buffer, 0, 4, 0);

        expect(buffer.toString("ascii")).to.be("dir\0");
        expect(vfs.fpos(fd)).to.be(3);    // only 3 bytes available
      });
    });

    /*
    describe(".write(fd, buffer, offset, length, position)", () => {
      it("should write buffer to file and update position", async () => {
        const buffer = Buffer.from("foo");
        const verify = Buffer.alloc(3);

        console.log(fd, vfs.isOpen(fd), vfs.fds);

        // TODO: figure out why .write is failing with EBADF
        await vfs.write(fd, buffer, 0, 3, 0);

        expect(vfs.fpos(fd)).to.be(3);

        await vfs.read(fd, buffer, 0, 3, 0);

        expect(verify.toString()).to.be("foo");
      });
    });
    */

    describe(".fpath(fd)", () => {
      it("should return virtual path used to open file descriptor", async () => {
        expect(vfs.fpath(fd)).to.be("/file");
      });
    });

    describe(".fstat(fd)", () => {
      it("should return file stats object", async () => {
        const stats = await vfs.fstat(fd);
        expect(stats).to.be.an("object");
        expect(stats.isDirectory).to.be.a("function");
        expect(stats.isSymbolicLink).to.be.a("function");
      });
    });
  });

  describe("working with file paths", () => {
    describe(".stat(path)", () => {
      it("should return file stats object", async () => {
        const stats = await vfs.stat("file");
        expect(stats).to.be.an("object");
        expect(stats.isDirectory).to.be.a("function");
        expect(stats.isSymbolicLink).to.be.a("function");
      });
    });

    describe(".lstat(path)", () => {
      it("should return file stats object", async () => {
        const stats = await vfs.lstat("file");
        expect(stats).to.be.an("object");
        expect(stats.isDirectory).to.be.a("function");
        expect(stats.isSymbolicLink).to.be.a("function");
      });
    });

    describe(".mkdir(path, [boolean])", () => {
      it("should make new directory", async () => {
        await vfs.mkdir("newdir");
        expect((await vfs.stat("newdir")).isDirectory()).to.be(true);
      });

      it("should make directories recursively", async () => {
        await vfs.mkdir("foo/bar/baz", true);
        expect((await vfs.stat("foo/bar/baz")).isDirectory()).to.be(true);
      });
    });

    describe(".readdir(path)", () => {
      it("should return directory contents", async () => {
        await vfs.mkdir("foo/bar", true);
        await vfs.mkdir("foo/baz", true);

        const entries = await vfs.readdir("foo");

        expect(entries.includes("bar")).to.be(true);
        expect(entries.includes("baz")).to.be(true);
      });
    });

    describe(".realpath(path)", () => {
      it("should resolve path within virtual file system", async () => {
        expect(vfs.realpath("foo")).to.be("/foo");
        expect(vfs.realpath("/foo")).to.be("/foo");
        expect(vfs.realpath("../foo")).to.be("/foo");
        expect(vfs.realpath("/../foo/../bar")).to.be("/bar");
      });
    });

    describe(".rename(from, to)", () => {
      it("should move file or directory", async () => {
        await vfs.mkdir("foo/bar", true);
        await vfs.rename("foo/bar", "foo/baz");

        expect((await vfs.stat("foo/baz")).isDirectory()).to.be(true);
      });
    });

    describe(".rmdir(path)", () => {
      it("should delete directory", async () => {
        let thrown;

        await vfs.mkdir("foo");
        await vfs.rmdir("foo");

        try { await vfs.stat("foo"); } catch (err) { thrown = err; }

        expect(thrown).to.be.an(Error);
      });
    });

    describe(".unlink(path)", () => {
      it("should delete file", async () => {
        let thrown;

        await vfs.unlink("file");

        try { await vfs.stat("file"); } catch (err) { thrown = err; }

        expect(thrown).to.be.an(Error);
      });
    });
  });

  describe("subordinate virtual file systems", () => {
    describe(".subfs(path)", () => {
      it("should return virtual file system at virtualized root", async () => {
        const subfs = vfs.subfs("sub");
        const stat = await subfs.stat("subfile");
        expect(stat).to.be.an("object");
      });
    });
  });
});
