const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const testing = process.argv.includes('--test');
const port = testing ? 27019 : 27018;
const replica = testing ? 'attendance-test' : 'attendance-local';
const data = path.resolve(__dirname, '../..', testing ? '.test-mongo' : '.local-mongo');
const executable = process.env.MONGOD_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe' : 'mongod');
async function isListening() {
  return new Promise(resolve => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}
(async () => {
  if (!await isListening()) {
    fs.mkdirSync(data, { recursive: true });
    const child = spawn(executable, ['--dbpath', data, '--port', String(port), '--bind_ip', '127.0.0.1', '--replSet', replica, '--logpath', path.join(data, 'mongo.log')], { windowsHide: true, detached: true, stdio: 'ignore' });
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    child.unref();
  }
  const result = spawnSync(process.execPath, [path.join(__dirname, 'initialize-local-db.cjs'), String(port), replica], { stdio: 'inherit', windowsHide: true });
  process.exitCode = result.status ?? 1;
})().catch(error => { console.error('Unable to start MongoDB. Install MongoDB or set MONGOD_PATH.', error.message); process.exitCode = 1; });
