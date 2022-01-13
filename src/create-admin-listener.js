import express from "express";
import basic from "express-basic-auth";

export default function createAdminListener({user, pass}) {
  const app = express();
  app.use(basic({users: {[user]: pass}}));
  return app;
}
