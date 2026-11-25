// Generate private Docker configuration; keep existing nonempty values unchanged.
const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const filename = path.join(__dirname, "..", ".env");
let contents = fs.existsSync(filename) ? fs.readFileSync(filename, "utf8") : "";
for (const key of ["MONGO_ROOT_PASSWORD", "MONGO_APP_PASSWORD", "JWT_SECRET"]) {
  const pattern = new RegExp(`^${key}=(.*)$`, "m");
  const existing = contents.match(pattern);
  if (existing && existing[1].trim().replace(/^['"]|['"]$/g, "")) continue;
  const line = `${key}=${randomBytes(48).toString("hex")}`;
  contents = existing ? contents.replace(pattern, line) : contents.replace(/\s*$/, "\n") + line + "\n";
}
fs.writeFileSync(filename, contents, { mode: 0o600 });
console.log("Docker secrets ready in .env. Start with: docker compose up --build -d --wait");
