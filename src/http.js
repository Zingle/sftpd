export function http303(location) {
  return function http303(req, res) {
    res.status(303).set("Location", location).send(`See Other: ${location}\n`);
  };
}

export function http400(reason) {
  return function http400(req, res) {
    res.status(400).send(`Bad Request: ${reason}\n`);
  };
}

export function http404() {
  return function http404(req, res) {
    res.status(404).send("Not Found\n");
  };
}

export function http405(...allow) {
  allow = allow.join(",");

  return function http405(req, res) {
    res.status(405).set("Allow", allow).send(`Method Not Allowed: use ${allow}\n`);
  };
}

export function http409(reason) {
  return function http409(req, res) {
    res.status(409).send(`Conflict: ${reason}\n`);
  };
}

export function http415() {
  return function http415(req, res) {
    res.status(415).send("Unsupported Media Type\n");
  };
}

export function http500() {
  return function http500(req, res) {
    res.status(500).send("Internal Server Error\n");
  };
}

export function errorHandler(logError=true) {
  return function errorHandler(err, req, res, next) {
    if (logError) console.error(err.message);
    http500(req, res);
  };
}

export function send303(res, location) {
  http303(location)(null, res);
}

export function send400(res, reason) {
  http400(reason)(null, res);
}

export function send404(res) {
  http404()(null, res);
}

export function send405(res, ...allow) {
  http405(...allow)(null, res);
}

export function send409(res, reason) {
  http409(reason)(null, res);
}

export function send415(res) {
  http415()(null, res);
}

export function send500(res) {
  http500()(null, res);
}
