import {EventEmitter} from "events";
import expect from "expect.js";
import {FTPProtocol} from "@zingle/sftpd";

describe("FTPProtocol.formatTime(date, [ref])", () => {
  it("should return date string formatted like Unix ls", () => {
    const date = new Date();
    const current = FTPProtocol.formatTime(date);

    date.setFullYear(date.getFullYear() + 2);

    const aged = FTPProtocol.formatTime(new Date(), date);

    expect(/^\S+ \d+ \d+:\d+$/.test(current)).to.be(true);
    expect(/^\S+ \d+ \d+$/.test(aged)).to.be(true);
  });
});

describe("FTPProtocol.implement(EventListener, VirtualFS)", () => {
  let sftp, vfs;

  beforeEach(() => {
    vfs = {}
    sftp = new EventEmitter();
    FTPProtocol.implement(sftp, vfs);
  });

  it("should setup CLOSE handler", () => {
    expect(sftp._events.CLOSE).to.be.a("function");
  });

  it("should setup FSTAT handler", () => {
    expect(sftp._events.FSTAT).to.be.a("function");
  });

  it("should setup LSTAT handler", () => {
    expect(sftp._events.LSTAT).to.be.a("function");
  });

  it("should setup MKDIR handler", () => {
    expect(sftp._events.MKDIR).to.be.a("function");
  });

  it("should setup OPEN handler", () => {
    expect(sftp._events.OPEN).to.be.a("function");
  });

  it("should setup OPENDIR handler", () => {
    expect(sftp._events.OPENDIR).to.be.a("function");
  });

  it("should setup READ handler", () => {
    expect(sftp._events.READ).to.be.a("function");
  });

  it("should setup READDIR handler", () => {
    expect(sftp._events.READDIR).to.be.a("function");
  });

  it("should setup REALPATH handler", () => {
    expect(sftp._events.REALPATH).to.be.a("function");
  });

  it("should setup REMOVE handler", () => {
    expect(sftp._events.REMOVE).to.be.a("function");
  });

  it("should setup RENAME handler", () => {
    expect(sftp._events.RENAME).to.be.a("function");
  });

  it("should setup RMDIR handler", () => {
    expect(sftp._events.RMDIR).to.be.a("function");
  });

  it("should setup STAT handler", () => {
    expect(sftp._events.STAT).to.be.a("function");
  });

  it("should setup WRITE handler", () => {
    expect(sftp._events.WRITE).to.be.a("function");
  });
});
