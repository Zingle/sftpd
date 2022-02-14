import mockfs from "mock-fs";

export const TEST_DIR = "testdir";

export function mockConfig(fn, file="sftpd.conf") {
  const conf = standard();

  mockfs({
    [file]: JSON.stringify(fn?fn(conf):conf)
  });

  function standard() {
    return {
      dir: TEST_DIR,
      http: {user: "foo", pass: "bar", port: 5986},
      sftp: {hostKeys: ["key", "key"], port: 5987}
    }
  }
}
