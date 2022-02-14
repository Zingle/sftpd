import crypto from "crypto";

const PBKDF_DIGEST = "sha512";
const PBKDF_ITERATIONS = 2048;
const PBKDF_KEY_LENGTH = 32;
const PBKDF_SALT_LENGTH = 16;

export default async function pbkdf2(password, verify=undefined) {
  if (verify !== undefined) {
    let [empty, digest, keylen, iterations, salt, key] = verify.split("$");

    iterations = Number(iterations);
    keylen = Number(keylen);

    if (empty) return false;
    if (!(digest && keylen && iterations && salt && key)) return false;
    if (iterations < 1 || keylen < 1) return false;

    return key === await hash(password, salt, iterations, keylen, digest);
  } else {
    const salt = crypto.randomBytes(PBKDF_SALT_LENGTH).toString("hex");
    const iterations = PBKDF_ITERATIONS;
    const keylen = PBKDF_KEY_LENGTH;
    const digest = PBKDF_DIGEST;
    const key = await hash(password, salt, iterations, keylen, digest);

    return `$${digest}$${keylen}$${iterations}$${salt}$${key}`;
  }

  async function hash(password, salt, iterations, keylen, digest) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, key) => {
        if (err) reject(err);
        else resolve(key.toString("hex"));
      });
    });
  }
}
