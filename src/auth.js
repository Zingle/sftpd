import {timingSafeEqual} from "crypto";
import shadowVerify from "shadow-verify";
import ssh from "ssh2";
import {pbkdf2} from "@zingle/sftpd";

function validateTimeSafe(value, allow) {
  const rejected = value.length !== allow.length;
  const match = timingSafeEqual(value, rejected ? value : allow);
  return match && !rejected;
}

export function verifyKey({key, blob, signature}, userKey) {
  if (typeof userKey === "string") userKey = ssh.utils.parseKey(userKey);

  if (key.algo !== userKey.type) return false;
  if (!validateTimeSafe(key.data, userKey.getPublicSSH())) return false;
  if (signature && userKey.verify(blob, signature) !== true) return false;

  return true;
}

export async function verifyPass({password}, {hash, shadow}) {
  if (hash && await pbkdf2(password, hash)) {
    return true;
  } else if (!hash && shadow && shadowVerify(password, shadow)) {
    return true;
  } else {
    return false;
  }
}
