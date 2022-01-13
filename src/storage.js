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
