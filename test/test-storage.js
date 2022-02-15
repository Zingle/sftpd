import expect from "expect.js";
import sinon from "sinon";
import {open} from "sqlite";
import sqlite from "sqlite3";
import {TemporaryStorage, Sqlite3Storage} from "@zingle/sftpd";

describe("TemporaryStorage", () => {
  describe("constructor([map])", () => {
    it("should initialize internal map", () => {
      const map = new Map();
      const storage = new TemporaryStorage(map);

      expect(storage.map).to.be(map);
    });
  });

  describe(".setItem(keyName, keyValue)", () => {
    let map, storage;

    beforeEach(() => {
      map = new Map();
      storage = new TemporaryStorage(map);
    });

    it("should write stringified value to internal map", async () => {
      await storage.setItem("foo", {bar: 42});

      expect(storage.map.has("foo")).to.be(true);
      expect(storage.map.get("foo")).to.be('{"bar":42}');
    });

    it("should error on non-string keyName", async () => {
      return new Promise(async (resolve, reject) => {
        try {
          await storage.setItem(43, {bar: 42});
          reject(new Error("expected thrown error"));
        } catch (err) {
          resolve();
        }
      });
    });

    it("should error on non-object keyValue", async () => {
      return new Promise(async (resolve, reject) => {
        try {
          await storage.setItem("foo", '{"bar":42}');
          reject(new Error("expected thrown error"));
        } catch (err) {
          resolve();
        }
      });
    });
  });

  describe(".getItem(keyName)", () => {
    let storage;

    beforeEach(() => {
      storage = new TemporaryStorage();
    });

    it("should read deserialized value from storage", async () => {
      await storage.setItem("foo", {bar: 42});
      const value = await storage.getItem("foo");
      expect(value).to.be.an("object");
      expect(JSON.stringify(value)).to.be('{"bar":42}');
    });

    it("should error on non-string keyName", async () => {
      return new Promise(async (resolve, reject) => {
        try {
          await storage.getItem(43);
          reject(new Error("expected thrown error"));
        } catch (err) {
          resolve();
        }
      });
    });

    it("should return null on missing value", async () => {
      const value = await storage.getItem("foo");
      expect(value).to.be(null);
    });
  });

  describe(".removeItem(keyName)", () => {
    let storage;

    beforeEach(() => {
      storage = new TemporaryStorage();
    });

    it("should delete value from storage", async () => {
      await storage.setItem("foo", {bar: 42});
      await storage.removeItem("foo");
      const value = await storage.getItem("foo");
      expect(value).to.be(null);
    });
  });

  it("should error on non-string keyName", async () => {
    return new Promise(async (resolve, reject) => {
      try {
        await storage.removeItem(43);
        reject(new Error("expected thrown error"));
      } catch (err) {
        resolve();
      }
    });
  });
});

describe("Sqlite3Storage", () => {
  let db, storage;

  beforeEach(async () => {
    const filename = ":memory:";
    const driver = sqlite.Database;
    db = await open({filename, driver});
    storage = new Sqlite3Storage(db);
    await Sqlite3Storage.initialize(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe("constructor(db)", () => {
    it("should initialize properties", () => {
      expect(storage.db).to.be(db);
    });
  });

  describe(".setItem(keyName, keyValue)", () => {
    let user;

    beforeEach(() => {
      const username = "foo_user";
      const uri = `/user/${username}`;
      const forwardURL = "http://example.com/foo";

      user = {username, uri, forwardURL};

      db.all = sinon.spy(async () => {});
    });

    it("should write value to DB", async () => {
      await storage.setItem(user.username, user);
      expect(storage.db.all.calledOnce).to.be(true);
    });

    it("should error on non-string keyName", async () => {
      return new Promise(async (resolve, reject) => {
        try {
          await storage.setItem(43, user);
          reject(new Error("expected thrown error"));
        } catch (err) {
          resolve();
        }
      });
    });

    it("should error on non-object keyValue", async () => {
      return new Promise(async (resolve, reject) => {
        try {
          await storage.setItem(user.username, '{"bar":42}');
          reject(new Error("expected thrown error"));
        } catch (err) {
          resolve();
        }
      });
    });
  });

  describe(".getItem(keyName)", () => {
    let user;

    beforeEach(() => {
      const username = "foo_user";
      const uri = `/user/${username}`;
      const forwardURL = "http://example.com:4567/foo";
      user = {username, uri, forwardURL};
    });

    it("should read value from storage", async () => {
      await storage.setItem(user.username, user);

      const value = await storage.getItem(user.username);

      expect(value).to.be.an("object");
      expect(value.username).to.be(user.username);
      expect(value.uri).to.be(user.uri);
      expect(value.forwardURL).to.be(user.forwardURL);
      expect(value.hash).to.be(null);
      expect(value.shadow).to.be(null);
      expect(value.key).to.be(null);
    });

    it("should error on non-string keyName", async () => {
      return new Promise(async (resolve, reject) => {
        try {
          await storage.getItem(43);
          reject(new Error("expected thrown error"));
        } catch (err) {
          resolve();
        }
      });
    });

    it("should return null on missing value", async () => {
      const value = await storage.getItem(user.username);
      expect(value).to.be(undefined);
    });
  });

  describe(".removeItem(keyName)", () => {
    let user;

    beforeEach(() => {
      const username = "foo_user";
      const uri = `/user/${username}`;
      const forwardURL = "http://example.com:4567/foo";
      user = {username, uri, forwardURL};
    });

    it("should delete value from storage", async () => {
      await storage.setItem(user.username, user);
      await storage.removeItem(user.username);
      const value = await storage.getItem(user.username);
      expect(value).to.be(undefined);
    });

    it("should error on non-string keyName", async () => {
      return new Promise(async (resolve, reject) => {
        try {
          await storage.removeItem(43);
          reject(new Error("expected thrown error"));
        } catch (err) {
          resolve();
        }
      });
    });
  });
});
