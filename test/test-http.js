import expect from "expect.js";
import Response from "mock-express-response";
import {http} from "@zingle/sftpd";

describe("http303(location)", () => {
  const location = "/foo";
  let middleware, req, res;

  beforeEach(() => {
    middleware = http.http303(location);
    req = {};
    res = new Response();
  });

  it("should return terminal middleware", () => {
    expect(middleware).to.be.a("function");
    expect(middleware.length).to.be(2);
  });

  it("should set 303 status", () => {
    middleware(req, res);
    expect(res.statusCode).to.be(303);
  });

  it("should set Location header", () => {
    middleware(req, res);
    expect(res.get("location")).to.be(location);
  });
});

describe("http400(reason)", () => {
  const reason = "human error";
  let middleware, req, res;

  beforeEach(() => {
    middleware = http.http400(reason);
    req = {};
    res = new Response();
  });

  it("should return terminal middleware", () => {
    expect(middleware).to.be.a("function");
    expect(middleware.length).to.be(2);
  });

  it("should set 400 status", () => {
    middleware(req, res);
    expect(res.statusCode).to.be(400);
  });

  it("should send reason in response", () => {
    middleware(req, res);
    expect(res._getString()).to.contain(reason);
  });
});

describe("http404()", () => {
  let middleware, req, res;

  beforeEach(() => {
    middleware = http.http404();
    req = {};
    res = new Response();
  });

  it("should return terminal middleware", () => {
    expect(middleware).to.be.a("function");
    expect(middleware.length).to.be(2);
  });

  it("should set 404 status", () => {
    middleware(req, res);
    expect(res.statusCode).to.be(404);
  });
});

describe("http405(...methods)", () => {
  const methods = ["PUT", "DELETE"];
  let middleware, req, res;

  beforeEach(() => {
    middleware = http.http405(methods);
    req = {};
    res = new Response();
  });

  it("should return terminal middleware", () => {
    expect(middleware).to.be.a("function");
    expect(middleware.length).to.be(2);
  });

  it("should set 405 status", () => {
    middleware(req, res);
    expect(res.statusCode).to.be(405);
  });

  it("should set Allow header", () => {
    middleware(req, res);
    expect(res.get("allow")).to.contain("PUT");
    expect(res.get("allow")).to.contain("DELETE");
    expect(res.get("allow")).to.not.contain("GET");
  });
});

describe("http409(reason)", () => {
  const reason = "that won't work";
  let middleware, req, res;

  beforeEach(() => {
    middleware = http.http409(reason);
    req = {};
    res = new Response();
  });

  it("should return terminal middleware", () => {
    expect(middleware).to.be.a("function");
    expect(middleware.length).to.be(2);
  });

  it("should set 409 status", () => {
    middleware(req, res);
    expect(res.statusCode).to.be(409);
  });

  it("should send reason in response", () => {
    middleware(req, res);
    expect(res._getString()).to.contain(reason);
  });
});

describe("http500()", () => {
  let middleware, req, res;

  beforeEach(() => {
    middleware = http.http500();
    req = {};
    res = new Response();
  });

  it("should return terminal middleware", () => {
    expect(middleware).to.be.a("function");
    expect(middleware.length).to.be(2);
  });

  it("should set 500 status", () => {
    middleware(req, res);
    expect(res.statusCode).to.be(500);
  });
});
