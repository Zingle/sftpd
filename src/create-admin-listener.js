import express from "express";
import basic from "express-basic-auth";
import {hash, http, url} from "@zingle/sftpd";

const {pbkdf2} = hash;

export default function createAdminListener({user, pass, userdb}) {
  const app = express();
  const unauthorizedResponse = "Unauthorized\n";

  app.use(basic({users: {[user]: pass}, unauthorizedResponse}));
  app.use(express.json());
  app.use(url());

  app.post("/user", async (req, res) => {
    const {username, password, key, ...extra} = req.body;
    const extras = Object.keys(extra).join(", ");

    if (!req.is("json")) return http.send415(res);
    if (!username) return http.send400(res, "username required");
    if (extras) return http.send400(res, `invalid key(s): ${extras}`);

    // TODO: make this safer with locked updates
    // TODO: for now, just use primitive eventual consistency
    if (await userdb.getItem(username)) {
      return http.send409(res, `username already exists: ${username}`);
    }

    const hash = password ? await pbkdf2(password) : undefined;
    const user = {username, hash, key, uri: `/user/${username}`};
    await userdb.setItem(username, user);

    http.send303(res, new URL(user.uri, req.fullURL));
  });

  app.get("/user/:username", async (req, res) => {
    const {username} = req.params;
    const user = await userdb.getItem(username);

    if (!user) return http.send404();

    res.json(user);
  });

  // setup fallback handlers
  app.all("/user", http.http405("POST"));
  app.all("/user/:username", http.http405("GET"));
  app.all("*", http.http404());
  app.use(http.errorHandler());

  return app;
}
