import expect from "expect.js";
import {fullURL} from "@zingle/sftpd";

describe("fullURL(req)", () => {
  it("should return full URL of request", () => {
    const protocol = "foo";
    const originalUrl = "/url/path?query=val";
    const req = {protocol, originalUrl, get: () => "example.com"};

    expect(fullURL(req)).to.be.a(URL);
    expect(String(fullURL(req))).to.be("foo://example.com/url/path?query=val");
  });
});
