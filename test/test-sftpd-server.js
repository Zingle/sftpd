import {Server} from "net";
import expect from "expect.js";
import {spy} from "sinon";
import {SFTPDServer, VirtualFS} from "@zingle/sftpd";

describe("SFTPDServer", () => {
  let config;

  beforeEach(() => {
    config = {
      dir: "path",
      http: {
        user: "foo",
        pass: "bar",
        port: 8765
      },
      sftp: {
        hostKeys: [RSA_KEY, ECDSA_KEY],
        port: 9876
      }
    };
  });

  describe("constructor({dir, userdb, http, sftp})", () => {
    let server;

    beforeEach(() => {
      server = new SFTPDServer(config);
    })

    describe("initialization", () => {
      it("should initialize virtual filesystem", () => {
        expect(server.vfs).to.be.a(VirtualFS);
        expect(server.vfs.root).to.be(config.dir);
      });

      it("should initialize HTTP server", () => {
        expect(server.httpServer).to.be.an("object");
        expect(server.listen).to.be.a("function");
      });

      it("should initialize SFTP server", () => {
        expect(server.sftpServer).to.be.an("object");
        expect(server.listen).to.be.a("function");
      });

      it("should initialize server ports", () => {
        expect(server.httpPort).to.be(config.http.port);
        expect(server.sftpPort).to.be(config.sftp.port);
      });

      it("should attach request listener to HTTP server", () => {
        expect(server.httpServer._events.request).to.be.a("function");
      });

      it("should attach connection listener to SFTP server", () => {
        expect(server.sftpServer._events.connection).to.be.a("function");
      });
    });

    describe("errors", () => {
      it("should error on missing HTTP config", () => {
        delete config.http;
        expect(() => new SFTPDServer(config)).to.throwError();
      });

      it("should error on missing HTTP user", () => {
        delete config.http.user;
        expect(() => new SFTPDServer(config)).to.throwError();
      });

      it("should error on missing HTTP password", () => {
        delete config.http.pass;
        expect(() => new SFTPDServer(config)).to.throwError();
      });

      it("should error on non-numeric HTTP port", () => {
        config.http.port = "4000";
        expect(() => new SFTPDServer(config)).to.throwError();
      });

      it("should error on missing SFTP config", () => {
        delete config.sftp;
        expect(() => new SFTPDServer(config)).to.throwError();
      });

      it("should error on missing/invalid SFTP host keys", () => {
        config.sftp.hostKeys = undefined;
        expect(() => new SFTPDServer(config)).to.throwError();

        config.sftp.hostKeys = [];
        expect(() => new SFTPDServer(config)).to.throwError();

        config.sftp.hostKeys = ["foo"];
        expect(() => new SFTPDServer(config)).to.throwError();
      });

      it("should error on non-numeric SFTP port", () => {
        config.sftp.port = "4000";
        expect(() => new SFTPDServer(config)).to.throwError();
      });
    });
  });

  describe(".listen()", () => {
    let server;

    beforeEach(() => {
      server = new SFTPDServer(config);

      server.httpServer.listen = spy();
      server.sftpServer.listen = spy();
    });

    it("should begin listening on HTTP server", () => {
      server.listen();

      expect(server.httpServer.listen.calledOnce).to.be(true);
      expect(server.httpServer.listen.calledWith(config.http.port)).to.be(true);
    });

    it("should begin listening on SFTP server", () => {
      server.listen();

      expect(server.sftpServer.listen.calledOnce).to.be(true);
      expect(server.sftpServer.listen.calledWith(config.sftp.port)).to.be(true);
    });
  });

  describe(".close()", () => {
    let server;

    beforeEach(() => {
      server = new SFTPDServer(config);

      server.httpServer.close = spy();
      server.sftpServer.close = spy();
    });

    it("should shutdown HTTP server", () => {
      server.close();
      expect(server.httpServer.close.calledOnce).to.be(true);
    });

    it("should shutdown SFTP server", () => {
      server.close();
      expect(server.sftpServer.close.calledOnce).to.be(true);
    });
  });

  describe("Event \"http:listening\"", () => {
    let server;

    beforeEach(() => {
      server = new SFTPDServer(config);
    });

    afterEach(() => {
      server.close();
    });

    it("should fire after calling .listen", async () => {
      return new Promise((resolve, reject) => {
        server.on("http:listening", resolve);
        server.listen();
      });
    });

    it("should pass port to listener", async () => {
      return new Promise((resolve, reject) => {
        server.on("http:listening", port => {
          expect(port).to.be(config.http.port);
          resolve();
        });

        server.listen();
      });
    });
  });

  describe("Event \"sftp:listening\"", () => {
    let server;

    beforeEach(() => {
      server = new SFTPDServer(config);
    });

    afterEach(() => {
      server.close();
    });

    it("should fire after calling .listen", async () => {
      return new Promise((resolve, reject) => {
        server.on("sftp:listening", resolve);
        server.listen();
      });
    });

    it("should pass port to listener", async () => {
      return new Promise((resolve, reject) => {
        server.on("sftp:listening", port => {
          expect(port).to.be(config.sftp.port);
          resolve();
        });

        server.listen();
      });
    });
  });
});

const RSA_KEY = "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn\nNhAAAAAwEAAQAAAQEArH99lUYLROPuyfgo+9Kdb9Iibq8QpWsMQXgikRIA4lVu6gNR6Kha\nnhO4NLCA1tnxxvebTtEiVaILk5HrZfTreck+mCXZC2EOSmKAa5q8LjeueOgHVO4nlTp7h8\n6G0ajyOpV0K0A7MWlQ6iSXFFjAHi7GYRTJLwV2Eck7ihK+ru/q4bttSOZB/OJzKZR9rSfY\n1cv3yd/lzh6moGcF/JrKtGY9McDS5LeGmwXp+HR8rHWNx00qSK17ERqyaG4IKAyCUwLkz9\noEfc+kZtitcc3RJTuGkT5ESUhV2J4tf5SzxUnQKqVYByUcPFTMwUnQ15QXdv44v3mBkX7c\n8AkUrH3BUQAAA8ixhqGcsYahnAAAAAdzc2gtcnNhAAABAQCsf32VRgtE4+7J+Cj70p1v0i\nJurxClawxBeCKREgDiVW7qA1HoqFqeE7g0sIDW2fHG95tO0SJVoguTketl9Ot5yT6YJdkL\nYQ5KYoBrmrwuN6546AdU7ieVOnuHzobRqPI6lXQrQDsxaVDqJJcUWMAeLsZhFMkvBXYRyT\nuKEr6u7+rhu21I5kH84nMplH2tJ9jVy/fJ3+XOHqagZwX8msq0Zj0xwNLkt4abBen4dHys\ndY3HTSpIrXsRGrJobggoDIJTAuTP2gR9z6Rm2K1xzdElO4aRPkRJSFXYni1/lLPFSdAqpV\ngHJRw8VMzBSdDXlBd2/ji/eYGRftzwCRSsfcFRAAAAAwEAAQAAAQEAgX4bmmnAn/C0G65N\npe2P/pey/YAycNuRkbxLxrfLLh2Qa+AeJxfrHuwSxosRzThDRmgukNZyffJt2lQacKmR9B\nTdBn6zFtW/UpvrZ9v7FH78XQtiJaG62U3T2jlyAAZiARSc5rMLPKag9YSOXdnaL05R4iMm\nfEQPRH7aUWaM+ukotfIvOmB1Zw6CPSB8bjSZHQCmk4LnLJWyfHxcJ70nwmh6TjbnhjLyfr\n3uyzazqKVbzdgXee8XtP/gqSpNcCabDoOp3buA6zYiYwOqXu7wVdUArcojE5qyuisK0JHS\nhI0VZY+sUb0c21bpgm5sxd31ZTVA8lanoslRER0dz074AQAAAIBUH5lO3rGwuGL3f4QqqJ\nNt8tHFJ6ZV1j7BQrPBzCY4fDLKvBCTIMtrC7A/PCimEoWqW2amrvfpRCK/PDgIMPZRUYwL\nu0kkKfIdrzTJSp3G5UKgCrvZN02IU5tx+TOSVhJMrhJ4PDRDImPgwLwBQftp8IIFtsWsAG\nZkHpTDg/J+4wAAAIEA2I4v/p0r842tdryABP9Z3pgaO3eIJxVcGieM/QqYxbtiRVKI0lvW\nqo3kNeSC3n43yqNOUj+2AzkyUK2W8qQXjkiDZV7nbK7lz7UP7VPG+Vur2jSARk6JUONBB9\nEe6IMC2g7JfScUQsiFY9jyE3YmY1j66Shummvxd5UposNEcxEAAACBAMvq8KIxTWN9ea+S\npSvvROv8TwyG6S2hiZ4EZ3jfD3pqyw84s53vB8HOgCNnvjaqk/M5idJPoxyIVABmGhn88p\nMAQP3oyWN6f1FqXx+TsOgEpRE42tXqBf4t1UJCzBJ4t8h7Q5IvmTf8jvSNGFr188+jMoln\nEZg+iM6mZ8VZ/+pBAAAADnJyZW1lckBwZW5ndWluAQIDBA==\n-----END OPENSSH PRIVATE KEY-----";

const ECDSA_KEY = "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAaAAAABNlY2RzYS\n1zaGEyLW5pc3RwMjU2AAAACG5pc3RwMjU2AAAAQQTKY21IUavUUlAVBmDyByPF+a25mw3M\n3NEWDCMGjxVtPcT1Nu7Xuy2PBsP3NIcGxTWXuqPbE4tHmid+9XVlMw7yAAAAqL/hcsu/4X\nLLAAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBMpjbUhRq9RSUBUG\nYPIHI8X5rbmbDczc0RYMIwaPFW09xPU27te7LY8Gw/c0hwbFNZe6o9sTi0eaJ371dWUzDv\nIAAAAhAOS1sJIlYRVL/U3KNDAZUiOC8ho8+nZjed8ghldAVXYHAAAADnJyZW1lckBwZW5n\ndWluAQ==\n-----END OPENSSH PRIVATE KEY-----";
