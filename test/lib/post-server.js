import http from "http";
import express from "express";
import bodyParser from "body-parser";

export default function createPostServer() {
  const app = express();
  const server = Object.assign(http.createServer(app), {
    accepted: 0
  });

  app.post("*", bodyParser.raw({limit: "10mb"}), (req, res) => {
    console.debug("accepted file");
    server.accepted++;
    res.status(202).send("202 Accepted\n");
  });

  app.use((err, req, res, next) => {
    if (err.message.includes("request entity too large")) {
      res.status(413).send("Payload Too Large\n");
    } else {
      console.error(err);
      res.status(500).send("Internal Server Error\n");
    }
  });

  return server;
}
