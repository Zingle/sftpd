import expect from "expect.js";
import mockfs from "mock-fs";
import {configure} from "@zingle/sftpd";

const globalConsole = console;
const DEFAULT_CONF = "sftp.conf";
const TEST_DIR = "testdir";

describe("configure({env, argv}, [console])", () => {
  const console = {log(){}, debug(){}, info(){}, warn(){}, error(){}};
  let env, argv;

  beforeEach(() => {
    env = {};
    argv = ["node", "sftp.js"];
  });

  afterEach(() => {
    mockfs.restore();
  });

  describe("configuration file", () => {
    it("should read config path from environment", () => {
      mkconf(null, "env.conf");
      env.SFTPD_CONFIG = "env.conf"
      expect(configure({env, argv}, console).dir).to.be(TEST_DIR);
    });

    it("should read config path from command-line", () => {
      mkconf(null, "cli.conf");
      argv.push("cli.conf");
      expect(configure({env, argv}, console).dir).to.be(TEST_DIR);
    });

    it("should read config from current directory", () => {
      mkconf(null, "sftpd.conf");
      expect(configure({env, argv}, console).dir).to.be(TEST_DIR);
    });
  });

  describe("configuration defaults", () => {
    it("should set dir to current directory", () => {
      mkconf(nodir);
      expect(configure({env, argv}, console).dir).to.be(process.cwd());

      function nodir(conf) {
        const {dir, ...config} = conf;
        return config;
      }
    });

    it("should set http port", () => {
      mkconf(noport);
      expect(configure({env, argv}, console).http.port).to.be.a("number");

      function noport(conf) {
        const {http: {port, ...http}, ...config} = conf;
        return {...config, http};
      }
    });

    it("should set sftp port", () => {
      mkconf(noport);
      expect(configure({env, argv}, console).sftp.port).to.be.a("number");

      function noport(conf) {
        const {sftp: {port, ...sftp}, ...config} = conf;
        return {...config, sftp};
      }
    });
  });

  describe("configuration errors", () => {
    it("should set error to null if configuration is ok", () => {
      mkconf(null);
      expect(configure({env, argv}, console).error).to.be(null);
    });

    it("should set error on missing http settings", () => {
      mkconf(nohttp);
      expect(configure({env, argv}, console).error).to.be.an(Error);

      function nohttp(conf) {
        const {http, ...remains} = conf;
        return remains;
      }
    });

    it("should set error on missing http user", () => {
      mkconf(nouser);
      expect(configure({env, argv}, console).error).to.be.an(Error);

      function nouser(conf) {
        const {http: {user, http}, ...config} = conf;
        return {http, ...config}
      }
    });

    it("should set error on missing http pass", () => {
      mkconf(nopass);
      expect(configure({env, argv}, console).error).to.be.an(Error);

      function nopass(conf) {
        const {http: {pass, http}, ...config} = conf;
        return {http, ...config};
      }
    });

    it("should set error if http port is string", () => {
      mkconf(strport);
      expect(configure({env, argv}, console).error).to.be.an(Error);

      function strport(conf) {
        const {http, ...config} = conf;
        return {...config, http: {...http, port: "45"}};
      }
    });

    it("should set error if http port is negative", () => {
      mkconf(negport);
      expect(configure({env, argv}, console).error).to.be.an(Error);

      function negport(conf) {
        const {http, ...config} = conf;
        return {...config, http: {...http, port: -300}};
      }
    });

    it("should set error on missing sftp settings", () => {
      mkconf(nosftp);
      expect(configure({env, argv}, console).error).to.be.an(Error);

      function nosftp(conf) {
        const {sftp, ...remains} = conf;
        return remains;
      }
    });

    it("should set error on missing sftp host keys", () => {
      mkconf(nokeys);
      expect(configure({env, argv}, console).error).to.be.an(Error);

      function nokeys(conf) {
        const {sftp, ...config} = conf;
        return {...config, sftp: {...sftp, hostKeys: []}};
      }
    });

    it("should set error if sftp port is string", () => {
      mkconf(strport);
      expect(configure({env, argv}, console).error).to.be.an(Error);

      function strport(conf) {
        const {sftp, ...config} = conf;
        return {...config, sftp: {...sftp, port: "45"}};
      }
    });

    it("should set error if sftp port is negative", () => {
      mkconf(negport);
      expect(configure({env, argv}, console).error).to.be.an(Error);

      function negport(conf) {
        const {sftp, ...config} = conf;
        return {...config, sftp: {...sftp, port: -300}};
      }
    });
  });
});

function mkconf(fn, file="sftpd.conf") {
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

function setupConf(conf) {
  mockfs.restore();
  mockfs({
    "conf/env": JSON.srtringify(conf)
  });
}
