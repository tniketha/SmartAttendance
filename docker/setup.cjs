// Generate local secrets without installing any dependencies. Existing values are preserved.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const filename = path.join(__dirname, '..', '.env');
let contents = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : '';
for (const name of ['MONGO_ROOT_PASSWORD', 'MONGO_APP_PASSWORD', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'QR_TOKEN_SECRET']) {
  const pattern = new RegExp(`^${name}=(.*)$`, 'm');
  const existing = contents.match(pattern);
  if (existing && existing[1].trim().replace(/^['"]|['"]$/g, '')) continue;
  const entry = `${name}=${randomBytes(48).toString('hex')}`;
  contents = existing ? contents.replace(pattern, entry) : contents.replace(/\s*$/, '\n') + entry + '\n';
}
fs.writeFileSync(filename, contents, { mode: 0o600 });
console.log('Docker secrets ready in .env (keep this file private). Run: docker compose up --build -d --wait');
