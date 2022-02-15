import {createReadStream, promises as fs} from "fs";
import {join, resolve} from "path";
import fetch from "node-fetch";
import locking from "proper-lockfile";

export default function forwarder({root, userdb, wait=5}) {
  return async function forward() {
    console.debug("locking", root, "for forwarding");
    const release = await locking.lock(root);

    try {
      console.info("forwarding files from", root);
      for await (const {path, mtime} of enumerate(root)) {
        const relpath = resolve("/", path.slice(root.length));
        const [_, username] = relpath.split("/", 2);

        if (!username) continue;

        const user = await userdb.getItem(username);

        if (!user) continue;

        const {forwardURL} = user;

        if (forwardURL && mtime.getTime() + wait*60000 < Date.now()) {
          console.debug("forwarding", path, "to", forwardURL);
          await forwardFile(path, forwardURL);
          console.info("removing forwarded file", path);
          await fs.unlink(path);
        }
      }
    } finally {
      console.debug("releasing lock on", root);
      await release();
    }
  }
}

async function forwardFile(path, forwardURL) {
  return new Promise((resolve, reject) => {
    const method = "POST";
    const headers = {"Content-Type": "application/octet-stream"};
    const body = createReadStream(path);

    body.on("error", reject);
    body.on("open", async () => {
      const res = await fetch(forwardURL, {method, headers, body});

      if (res.ok) {
        resolve();
      } else {
        const status = `${res.status} ${res.statusText}`;
        reject(new Error(`unexpected ${status} from ${forwardURL}`));
      }
    });
  });
}

async function* enumerate(dir) {
  const entries = await fs.readdir(dir);
  const paths = entries.filter(hidden).map(entry => join(dir, entry));

  for (const path of paths) {
    const stat = await fs.lstat(path);

    if (stat.isDirectory()) {
      yield* enumerate(path);
    } else if (stat.isFile() && !stat.isSymbolicLink()) {
      yield Object.assign(stat, {path});
    }
  }

  function hidden(entry) {
    return entry[0] !== ".";
  }
}
