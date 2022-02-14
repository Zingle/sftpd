import expect from "expect.js";
import mockfs from "mock-fs";
import sinon from "sinon";
import {readConfig} from "@zingle/sftpd";
import {DEFAULT_CONF} from "@zingle/sftpd";
import {TEST_DIR, mockConfig} from "./lib/mock-config.js";

describe("readConfig({env, argv})", () => {
  let env, argv;

  beforeEach(() => {
    env = {};
    argv = ["node", "script.js"];

    console.log = sinon.spy();
    console.debug = sinon.spy();
    console.info = sinon.spy();
    console.warn = sinon.spy();
    console.error = sinon.spy();
  });

  afterEach(() => {
    delete console.log;
    delete console.debug;
    delete console.info;
    delete console.warn;
    delete console.error;

    mockfs.restore();
  });

  describe("configuration file", () => {
    it("should read config file path from environment", () => {
      mockConfig(null, "env.conf");
      env.SFTPD_CONFIG = "env.conf";
      expect(readConfig({env, argv}).dir).to.be(TEST_DIR);
    });

    it("should read config path from command-line", () => {
      mockConfig(null, "cli.conf");
      argv.push("cli.conf");
      expect(readConfig({env, argv}).dir).to.be(TEST_DIR);
    });

    it("should read config from current directory", () => {
      mockConfig(null, "sftpd.conf");
      expect(readConfig({env, argv}).dir).to.be(TEST_DIR);
    });
  });

  describe("configuration defaults", () => {
    it("should set dir to current directory", () => {
      mockConfig(nodir);
      expect(readConfig({env, argv}).dir).to.be(process.cwd());

      function nodir(conf) {
        const {dir, ...config} = conf;
        return config;
      }
    });

    it("should set http port", () => {
      mockConfig(noport);
      expect(readConfig({env, argv}).http.port).to.be.a("number");

      function noport(conf) {
        const {http: {port, ...http}, ...config} = conf;
        return {...config, http};
      }
    });

    it("should set sftp port", () => {
      mockConfig(noport);
      expect(readConfig({env, argv}).sftp.port).to.be.a("number");

      function noport(conf) {
        const {sftp: {port, ...sftp}, ...config} = conf;
        return {...config, sftp};
      }
    });
  });

  describe("configuration errors", () => {
    it("should throw on missing http settings", () => {
      mockConfig(nohttp);
      expect(() => readConfig({env, argv})).to.throwError();

      function nohttp(conf) {
        const {http, ...remains} = conf;
        return remains;
      }
    });

    it("should throw on missing http user", () => {
      mockConfig(nouser);
      expect(() => readConfig({env, argv})).to.throwError();

      function nouser(conf) {
        const {http: {user, http}, ...config} = conf;
        return {http, ...config}
      }
    });

    it("should throw on missing http pass", () => {
      mockConfig(nopass);
      expect(() => readConfig({env, argv})).to.throwError();

      function nopass(conf) {
        const {http: {pass, http}, ...config} = conf;
        return {http, ...config};
      }
    });

    it("should throw if http port is string", () => {
      mockConfig(strport);
      expect(() => readConfig({env, argv})).to.throwError();

      function strport(conf) {
        const {http, ...config} = conf;
        return {...config, http: {...http, port: "45"}};
      }
    });

    it("should throw if http port is negative", () => {
      mockConfig(negport);
      expect(() => readConfig({env, argv})).to.throwError();

      function negport(conf) {
        const {http, ...config} = conf;
        return {...config, http: {...http, port: -300}};
      }
    });

    it("should throw on missing sftp settings", () => {
      mockConfig(nosftp);
      expect(() => readConfig({env, argv})).to.throwError();

      function nosftp(conf) {
        const {sftp, ...remains} = conf;
        return remains;
      }
    });

    it("should throw on missing sftp host keys", () => {
      mockConfig(nokeys);
      expect(() => readConfig({env, argv})).to.throwError();

      function nokeys(conf) {
        const {sftp, ...config} = conf;
        return {...config, sftp: {...sftp, hostKeys: []}};
      }
    });

    it("should throw if sftp port is string", () => {
      mockConfig(strport);
      expect(() => readConfig({env, argv})).to.throwError();

      function strport(conf) {
        const {sftp, ...config} = conf;
        return {...config, sftp: {...sftp, port: "45"}};
      }
    });

    it("should throw if sftp port is negative", () => {
      mockConfig(negport);
      expect(() => readConfig({env, argv})).to.throwError();

      function negport(conf) {
        const {sftp, ...config} = conf;
        return {...config, sftp: {...sftp, port: -300}};
      }
    });
  });
});
