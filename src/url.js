export default function url() {
  return function url(req, res, next) {
    const host = req.get("host");
    req.fullURL = new URL(`${req.protocol}://${host}${req.originalUrl}`);
    next();
  }
}
