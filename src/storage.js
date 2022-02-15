import SQL from "sql-template-strings";

export class Sqlite3Storage {
  constructor(db) {
    this.db = db;
  }

  static async initialize(db) {
    await db.exec(`
      create table if not exists user (
        username varchar not null primary key,
        uri varchar not null,
        hash varchar,
        shadow varchar,
        key varchar,
        forward_url varchar
      )
    `);

    return db;
  }

  async getItem(keyName) {
    if (typeof keyName !== "string") {
      throw new TypeError("keyName must be a string");
    }

    const user = await this.db.get(SQL`
      select * from user where username = ${keyName}
    `);

    if (user) {
      user.forwardURL = user.forward_url;
      delete user.forward_url;
    }

    return user;
  }

  async setItem(keyName, keyValue) {
    if (typeof keyName !== "string") {
      throw new TypeError("keyName must be a string");
    } else if (typeof keyValue !== "object") {
      throw new TypeError("keyValue must be an object");
    }

    await this.db.all(SQL`
      insert into user (username, uri, hash, shadow, key, forward_url)
      values (
        ${keyName}, ${keyValue.uri},
        ${keyValue.hash||null}, ${keyValue.shadow||null},
        ${keyValue.key||null}, ${keyValue.forwardURL||null}
      )
    `);
  }

  async removeItem(keyName) {
    if (typeof keyName !== "string") {
      throw new TypeError("keyName must be a string");
    }

    await this.db.all(SQL`
      delete from user where username = ${keyName}
    `);
  }
}

export class TemporaryStorage {
  constructor(map=new Map()) {
    this.map = map;
  }

  async getItem(keyName) {
    if (typeof keyName !== "string") {
      throw new TypeError("keyName must be a string");
    }

    await tick();
    return JSON.parse(this.map.get(keyName) || null);
  }

  async setItem(keyName, keyValue) {
    if (typeof keyName !== "string") {
      throw new TypeError("keyName must be a string");
    } else if (typeof keyValue !== "object") {
      throw new TypeError("keyValue must be an object");
    }

    await tick();
    this.map.set(keyName, JSON.stringify(keyValue));
  }

  async removeItem(keyName) {
    if (typeof keyName !== "string") {
      throw new TypeError("keyName must be a string");
    }

    await tick();
    this.map.delete(keyName);
  }
}

async function tick() {
  return new Promise(tick => setTimeout(tick, 0));
}
