const { MongoClient } = require('mongodb');
const port = Number(process.argv[2]);
const replica = process.argv[3];
if (![27018, 27019].includes(port) || !['attendance-local', 'attendance-test'].includes(replica)) throw new Error('Only the dedicated local development ports are allowed');
(async () => {
  const client = new MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const admin = client.db('admin');
    try {
      const config = await admin.command({ replSetGetConfig: 1 });
      if (config.config._id !== replica) throw new Error('Port belongs to a different replica set');
    } catch (error) {
      if (error.code !== 94) throw error;
      await admin.command({ replSetInitiate: { _id: replica, members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
    }
    for (let attempt = 0; attempt < 40; attempt++) {
      if ((await admin.command({ hello: 1 })).isWritablePrimary) {
        const db = port === 27019 ? 'attendance_security_test' : 'smart_attendance';
        console.log(`Ready: mongodb://127.0.0.1:${port}/${db}?replicaSet=${replica}`);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('Replica set did not elect a primary');
  } finally { await client.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
