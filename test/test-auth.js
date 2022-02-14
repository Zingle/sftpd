import expect from "expect.js";
import {createVerify} from "crypto";
import ssh from "ssh2";
import {verifyKey, verifyPass} from "@zingle/sftpd";

const MOCK_ALGO = "ssh-rsa";
const MOCK_PUBKEY = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC738a6lQ9U7e0xUpnO9bmX2OBZwL2bc8+Q5VhUfep1mUexUEGe6rsLN5WesqRdDgFUgr2pJGTUcpFtCUDhzXIKbTs/mrOvED88Tlcbt6goLiCurkNuitIubEUrn+Q9omcHp1InTEfN+CjqHwSA007+4cai8cWV35cdE3iwCWwQLUXtNXtu0MhDT5YUw7GaKgIcnHjuvYR9SRT9J0A3gticGlvevb1N6s3kwnRjUe4VxehWwn+zBFFif4C4rV1i9MS3m30nM8Pj/AqSQF5wpkPGX5ldZa+OMLhD/3LXuO+UH9D8LtZR2O1fy1oo/xz0VRnv3gfb/S22D1uL4bKIYBYJ"
const MOCK_PASS = "password";
const MOCK_PASS_PBKDF2 = "$sha512$32$2048$99cae3cc505fe639168a6c6516704e5d$5684e534574c48663c14bd286c31ed8d984f11036b57254fb58753cc99bea991"
const MOCK_PASS_SHADOW = "$6$2aQi7cpDrGnB8Mtm$q5kdhjWZilVzpJXHPEPZLZ6qQz/7b8vAmxr6UgjRrZ2egglVdGiS9840YXJkfQss/uzZb6Ph3Hecu9jkEB.gj.";

describe("verifyKey({key, blob, signature}, userKey)", () => {
  let ctx;
  let userKey;

  beforeEach(() => {
    userKey = MOCK_PUBKEY;

    ctx = {
      blob: Buffer.alloc(4),
      signature: Buffer.alloc(8),
      key: {
        algo: MOCK_ALGO,
        data: Buffer.from(MOCK_PUBKEY),
      }
    };

    userKey = {
      type: MOCK_ALGO,
      getPublicSSH() { return Buffer.from(MOCK_PUBKEY); },
      verify(blob, sig) { return blob === ctx.blob && sig === ctx.signature; }
    };
  });

  it("should return true on valid key", () => {
    expect(verifyKey(ctx, userKey)).to.be(true);
  });

  it("should return false if algos don't match", () => {
    ctx.key.algo = "foo";
    expect(verifyKey(ctx, userKey)).to.be(false);
  });

  it("should return false if key data doesn't match", () => {
    ctx.key.data = Buffer.from("sadf");
    expect(verifyKey(ctx, userKey)).to.be(false);
  });
});

describe("verifyPass({password}, {hash, shadow})", () => {
  const password = MOCK_PASS;

  it("should return true if password matches pbkdf2 hash", async () => {
    const hash = MOCK_PASS_PBKDF2;
    expect(await verifyPass({password}, {hash})).to.be(true);
  });

  it("should return true if password matches crypt(3) shadow", async () => {
    const shadow = MOCK_PASS_SHADOW;
    expect(await verifyPass({password}, {shadow})).to.be(true);
  });

  it("should reject bad pbkdf2 hash even if shadow matches", async () => {
    const hash = "INVALID_HASH";
    const shadow = MOCK_PASS_SHADOW;
    expect(await verifyPass({password}, {hash, shadow})).to.be(false);
  });

  it("should accept pbkdf2 hash even if shadow does not match", async () => {
    const hash = MOCK_PASS_PBKDF2;
    const shadow = "INVALID_SHADOW";
    expect(await verifyPass({password}, {hash, shadow})).to.be(true);
  });
});
