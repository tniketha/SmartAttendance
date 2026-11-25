const dotenv = require("dotenv");
const { randomBytes } = require("node:crypto");
dotenv.config();
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Set JWT_SECRET to at least 32 random characters.");
  jwtSecret = randomBytes(48).toString("hex");
}
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 1)
  throw new Error("TRUST_PROXY_HOPS must be 0 or 1.");
module.exports.ENV = {
  PORT: Number(process.env.PORT || 5000),
  JWT_SECRET: jwtSecret,
  TRUST_PROXY_HOPS: trustProxyHops,
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || "http://localhost:8081")
    .split(",")
    .map((origin) => origin.trim()),
};
