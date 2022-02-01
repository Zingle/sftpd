import express from "express";
import basic from "express-basic-auth";
import {hash, http, url} from "@zingle/sftpd";

const {pbkdf2} = hash;

export function requestListener({user, pass, userdb, subdb}) {
  const app = express();
  const unauthorizedResponse = "Unauthorized\n";

  app.use(basic({users: {[user]: pass}, unauthorizedResponse}));
  app.use(express.json());
  app.use(url());

  app.post("/user", async (req, res) => {
    const {username, password, key, forwardURL, ...extra} = req.body;
    const uri = `/user/${username}`;
    const extras = Object.keys(extra).join(", ");

    if (!req.is("json")) return http.send415(res);
    if (!username) return http.send400(res, "username required");
    if (extras) return http.send400(res, `invalid key(s): ${extras}`);
    if (forwardURL) try { new URL(forwardURL); } catch (err) {
      return http.send400(res, "invalid forward URL");
    }

    // TODO: make this safer with locked updates
    // TODO: for now, just use primitive eventual consistency
    if (await userdb.getItem(username)) {
      return http.send409(res, `username already exists: ${username}`);
    }

    await userdb.setItem(username, {
      username, key, uri,
      hash: password ? await pbkdf2(password) : undefined,
      forwardURL: forwardURL ? new URL(forwardURL) : undefined
    });

    http.send303(res, new URL(uri, req.fullURL));
  });

  app.get("/user/:username", async (req, res) => {
    const {username} = req.params;
    const user = await userdb.getItem(username);

    if (!user) return http.send404(res);

    res.json(user);
  });

  // setup fallback handlers
  app.all("/user", http.http405("POST"));
  app.all("/user/:username", http.http405("GET"));
  app.all("*", http.http404());
  app.use(http.errorHandler());

  return app;
}
