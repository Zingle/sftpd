import expect from "expect.js";
import {hash} from "@zingle/sftpd";

const {pbkdf2} = hash;

describe("pbkdf2(plain, [verifyHash])", () => {
  const plain = "foo";

  it("should generate hash from plain-text", async () => {
    const hash = await pbkdf2(plain);

    expect(hash).to.be.a("string");
    expect(hash).to.not.be(plain);
  });

  it("should generate unique salted hash each time", async () => {
    const hashA = await pbkdf2(plain);
    const hashB = await pbkdf2(plain);

    expect(hashA).to.not.be(hashB);
  });

  it("should verify previously hashed value", async () => {
    const hash = await pbkdf2(plain);

    expect(await pbkdf2(plain, hash)).to.be(true);
    expect(await pbkdf2(plain, plain)).to.be(false);
  });
});
