import expect from "expect.js";
import sinon from "sinon";
import mockfs from "mock-fs";
import {promises as fs} from "fs";
import http from "http";
import locking from "proper-lockfile";
import {forwarder, TemporaryStorage} from "@zingle/sftpd";
import createPostServer from "./lib/post-server.js";

describe("forwarder({root, userdb, [wait]})", () => {
  const username = "foo_user";
  const root = "/test/dir";
  const wait = 0;
  let forward, userdb, server;

  beforeEach(async () => {
    userdb = new TemporaryStorage();
    forward = forwarder({root, userdb, wait});
    server = createPostServer();

    mockfs({
      "/test/dir": {
        [username]: {"file.txt": "foo bar"}
      }
    });

    console.debug = () => {};
    console.info = () => {};

    return new Promise((resolve, reject) => {
      server.listen(async function() {
        const {port} = server.address();
        const forwardURL = new URL(`http://localhost:${port}/file`);
        await userdb.setItem(username, {forwardURL});
        resolve();
      });
    });
  });

  afterEach(() => {
    mockfs.restore();
    server.close();

    delete console.debug;
    delete console.info;
  });

  describe("factory interface", () => {
    it("should return async forward function", () => {
      expect(forward).to.be.a("function");
      expect(forward.name).to.be("forward");
      expect(forward.length).to.be(0);
      expect(forward[Symbol.toStringTag]).to.be("AsyncFunction")
    });
  });

  describe("forwarding files", () => {
    it("should forward user files to user's forwardURL", async () => {
      await forward();
      expect(server.accepted).to.be(1);
    });

    it("should delete file after forwarding", async () => {
      return new Promise(async (resolve) => {
        let error;

        await forward();

        try {
          await fs.access(`/test/dir/${username}/file.txt`);
        } catch (err) {
          expect(err.code).to.be("ENOENT");
          error = err;
        }

        expect(error).to.be.an(Error);
        resolve();
      });
    });

    it("should skip files with recent mtimes", async () => {
      forward = forwarder({root, userdb});

      return new Promise(async (resolve) => {
        await forward();
        await fs.access(`/test/dir/${username}/file.txt`);
        resolve();
      });
    });
  });

  describe("locking", () => {
    let lock, release, oldlock;

    beforeEach(() => {
      oldlock = locking.lock
      release = sinon.spy(async function() {});
      lock = sinon.spy(async function() { return release; })
      locking.lock = lock;
    });

    afterEach(() => {
      locking.lock = oldlock;
    });

    it("should lock directory while forwarding", async () => {
      await forward();
      expect(lock.calledOnce).to.be(true);
      expect(release.calledOnce).to.be(true);
    });
  });
});
