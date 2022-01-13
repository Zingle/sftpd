export default function createAuthenticationListener() {
  return function authenticationListener(ctx) {
    switch (ctx.method) {
      case "password":
        return ctx.reject();
      case "publickey":
        return ctx.reject();
      default:
        return ctx.reject(["password", "publickey"]);
    }
  }
}
