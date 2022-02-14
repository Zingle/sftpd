import expect from "expect.js";
import {ftp} from "@zingle/sftpd";

describe("ftp commands", () => {
  it("should export CLOSE handler", () => {
    expect(ftp.close).to.be.a("function");
  });

  it("should export FSTAT handler", () => {
    expect(ftp.fstat).to.be.a("function");
  });

  it("should export LSTAT handler", () => {
    expect(ftp.lstat).to.be.a("function");
  });

  it("should export MKDIR handler", () => {
    expect(ftp.mkdir).to.be.a("function");
  });

  it("should export OPEN handler", () => {
    expect(ftp.open).to.be.a("function");
  });

  it("should export OPENDIR handler", () => {
    expect(ftp.opendir).to.be.a("function");
  });

  it("should export READ handler", () => {
    expect(ftp.read).to.be.a("function");
  });

  it("should export READDIR handler", () => {
    expect(ftp.readdir).to.be.a("function");
  });

  it("should export REALPATH handler", () => {
    expect(ftp.realpath).to.be.a("function");
  });

  it("should export REMOVE handler", () => {
    expect(ftp.remove).to.be.a("function");
  });

  it("should export RENAME handler", () => {
    expect(ftp.rename).to.be.a("function");
  });

  it("should export RMDIR handler", () => {
    expect(ftp.rmdir).to.be.a("function");
  });

  it("should export STAT handler", () => {
    expect(ftp.stat).to.be.a("function");
  });

  it("should export WRITE handler", () => {
    expect(ftp.write).to.be.a("function");
  });
});

/*
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
*/
