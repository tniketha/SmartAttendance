// Idempotent bootstrap; never deletes application data or changes existing passwords.
let connection;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    connection = new Mongo('mongodb://mongo:27017/?directConnection=true');
    if (!connection.getDB('admin').auth('root', process.env.MONGO_ROOT_PASSWORD)) {
      throw new Error('MongoDB authentication failed');
    }
    break;
  } catch (error) {
    if (attempt === 59) throw error;
    sleep(2000);
  }
}
const admin = connection.getDB('admin');
const status = admin.runCommand({ replSetGetStatus: 1 });
if (status.code === 94) {
  const result = admin.runCommand({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: 'mongo:27017' }] } });
  if (!result.ok) throw new Error(result.errmsg);
} else if (!status.ok) {
  throw new Error(status.errmsg);
}
for (let attempt = 0; !admin.runCommand({ hello: 1 }).isWritablePrimary; attempt++) {
  if (attempt === 60) throw new Error('MongoDB did not elect a primary');
  sleep(1000);
}
const app = connection.getDB('smart_attendance');
if (!app.getUser('attendance')) {
  app.createUser({
    user: 'attendance', pwd: process.env.MONGO_APP_PASSWORD,
    roles: [
      { role: 'readWrite', db: 'smart_attendance' },
      { role: 'readWrite', db: 'attendance_security_test' },
    ],
  });
}
// Validate the supplied credentials even when the user already exists.
const check = new Mongo('mongodb://mongo:27017/?directConnection=true');
if (!check.getDB('smart_attendance').auth('attendance', process.env.MONGO_APP_PASSWORD)) {
  throw new Error('Application password does not match the persisted database user');
}
print('Replica set and application user ready');
