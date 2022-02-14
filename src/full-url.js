export default function fullURL(req) {
  const host = req.get("host");
  return new URL(`${req.protocol}://${host}${req.originalUrl}`);
}
