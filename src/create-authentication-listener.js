import {hash} from "@zingle/sftpd";

const {pbkdf2} = hash;

export default function createAuthenticationListener({userdb}) {
  return async function authenticationListener(ctx) {
    const methods = [];
    const user = await userdb.getItem(ctx.username);

    if (user.hash) methods.push("password");
    if (user.key) methods.push("key");

    if (methods.includes(ctx.method)) {
      console.info(`sftpd: authenticating with ${ctx.method} -- ${ctx.username}`);
    }

    switch (ctx.method) {
      case "password":
        return await pbkdf2(ctx.password, user.hash)
          ? ctx.accept() : ctx.reject(methods);
      case "publickey":
        return ctx.reject(methods);
      default:
        return ctx.reject(methods);
    }
  }
}
