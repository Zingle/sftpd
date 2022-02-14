import expect from "expect.js";
import sinon from "sinon";
import {patchConsole} from "@zingle/sftpd";

const globalConsole = console;

describe("patch({env, argv}, [console])", () => {
  let env, argv;
  let debug, info, warn, error;

  beforeEach(() => {
    debug = sinon.spy();
    info = sinon.spy();
    warn = sinon.spy();
    error = sinon.spy();

    env = {};
    argv = ["node", "script.js"];
    Object.assign(globalConsole, {debug, info, warn, error})
  });

  afterEach(() => {
    delete globalConsole.debug;
    delete globalConsole.info;
    delete globalConsole.warn;
    delete globalConsole.error;
  });

  it("should patch global console if none provided", () => {
    patchConsole({env, argv});
    expect(globalConsole.info).to.not.be(info);
  });

  it("should patch .debug, .info, .warn, and .error", () => {
    patchConsole({env, argv});
    expect(globalConsole.debug).to.not.be(debug);
    expect(globalConsole.info).to.not.be(info);
    expect(globalConsole.warn).to.not.be(warn);
    expect(globalConsole.error).to.not.be(error);
  });

  it("should patch provided console", () => {
    const console = {};
    patchConsole({env, argv}, console);
    expect(console.debug).to.be.a("function");
    expect(console.info).to.be.a("function");
    expect(console.warn).to.be.a("function");
    expect(console.error).to.be.a("function");
  });
});
