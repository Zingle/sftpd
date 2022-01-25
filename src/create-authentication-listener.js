import {hash} from "@zingle/sftpd";

const {pbkdf2} = hash;

export default function createAuthenticationListener({userdb}) {
  return async function authenticationListener(ctx) {
    const client = this;
    const methods = [];
    const user = await userdb.getItem(ctx.username);

    if (user?.hash) methods.push("password");
    if (user?.key) methods.push("key");

    if (methods.includes(ctx.method)) {
      console.info(`sftpd: authenticating with ${ctx.method} -- ${ctx.username}`);
    } else {
      return ctx.reject(methods);
    }

    switch (ctx.method) {
      case "password":
        if (await pbkdf2(ctx.password, user.hash)) {
          client.username = ctx.username;
          return ctx.accept();
        } else {
          return ctx.reject(methods);
        }
    }

    return ctx.reject(methods);
  }
}
