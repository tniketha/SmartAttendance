const dotenv = require("dotenv");
const { randomBytes } = require("node:crypto");
dotenv.config();
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Set JWT_SECRET to at least 32 random characters.");
  jwtSecret = randomBytes(48).toString("hex");
}
module.exports.ENV = {
  PORT: Number(process.env.PORT || 5000),
  JWT_SECRET: jwtSecret,
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || "http://localhost:8081")
    .split(",")
    .map((origin) => origin.trim()),
};
