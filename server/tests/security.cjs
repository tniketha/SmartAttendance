const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
// A dedicated replica-set database is mandatory. Never run against the app database.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'mongodb://127.0.0.1:27019/attendance_security_test?replicaSet=attendance-test';
if (new URL(process.env.DATABASE_URL).pathname !== '/attendance_security_test') throw new Error('Tests require the dedicated attendance_security_test database');
process.env.PORT = '0';
process.env.NODE_ENV = 'test';
const prisma = require('../dist/config/database').default;
const { app, httpServer } = require('../dist/index');
const { getIO } = require('../dist/services/socket.service');
const { expireSessions } = require('../dist/services/session.service');
const { QRService } = require('../dist/services/qr.service');
const { signPayload } = require('../dist/utils/crypto.utils');
const { io } = require('../../node_modules/socket.io-client');
const bcrypt = require('bcrypt');

test('attendance security integration', async t => {
  if (!httpServer.listening) await once(httpServer, 'listening');
  const base = `http://127.0.0.1:${httpServer.address().port}`;
  const suffix = randomUUID().slice(0, 8);
  const password = 'Testing attendance 234!';
  const request = async (path, token, body, method = body ? 'POST' : 'GET') => {
    const response = await fetch(base + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const text = await response.text();
    let json; try { json = JSON.parse(text); } catch { json = text; }
    return { status: response.status, body: json };
  };
  const login = async user => { const r = await request('/auth/login', null, { identifier: user.email, password }); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body.data; };
  let department;
  const users = [], modules = [];
  try {
    department = await prisma.department.create({ data: { code: suffix, name: 'Security test ' + suffix } });
    const createUser = async (role, n) => {
      const user = await prisma.user.create({ data: { email: `${suffix}-${n}@example.test`, name: n === 'student' ? '=HYPERLINK("unsafe")' : n, role, passwordHash: await bcrypt.hash(password, 4) } });
      users.push(user);
      const profile = role === 'LECTURER' ? await prisma.lecturer.create({ data: { userId: user.id, employeeNumber: suffix + n, departmentId: department.id } }) : await prisma.student.create({ data: { userId: user.id, studentNumber: suffix + n, departmentId: department.id, programme: 'Test', academicYear: '2026', batch: 'Test' } });
      return { ...user, profile };
    };
    const lecturer = await createUser('LECTURER', 'lecturer');
    const outsider = await createUser('LECTURER', 'outsider');
    const student = await createUser('STUDENT', 'student');
    const second = await createUser('STUDENT', 'second');
    const module = await prisma.module.create({ data: { moduleCode: suffix, moduleName: 'Security test', departmentId: department.id, lecturerId: lecturer.profile.id, academicYear: '2026', semester: 1 } });
    modules.push(module);
    for (const s of [student, second]) await prisma.enrollment.create({ data: { moduleId: module.id, studentId: s.profile.id } });
    const l = await login(lecturer), o = await login(outsider), s = await login(student), s2 = await login(second);
    const create = async (extra = {}) => { const r = await request('/lecturer/sessions', l.accessToken, { moduleId: module.id, durationMinutes: 10, lateThresholdMinutes: 5, ...extra }); assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body.data; };
    const session = await create();
    await t.test('authentication and resource ownership', async () => {
      assert.equal((await request('/lecturer/sessions/' + session.session.id + '/live')).status, 401);
      assert.equal((await request('/lecturer/dashboard', s.accessToken)).status, 403);
      for (const path of ['/lecturer/sessions/' + session.session.id + '/live', '/lecturer/modules/' + module.id + '/students', '/reports/module/' + module.id, '/reports/module/' + module.id + '/export-csv']) assert.equal((await request(path, o.accessToken)).status, 403, path);
      assert.equal((await request('/lecturer/sessions/not-an-id/live', l.accessToken)).status, 400);
    });
    await t.test('socket rejects anonymous clients', async () => {
      const socket = io(base, { reconnection: false, timeout: 1500 });
      try { const [error] = await once(socket, 'connect_error'); assert.match(error.message, /Authentication/); }
      finally { socket.disconnect(); }
    });
    await t.test('strict inputs and signed QR integrity', async () => {
      assert.equal((await request('/auth/login', null, { identifier: {}, password: [] })).status, 400);
      assert.equal((await request('/lecturer/sessions', l.accessToken, { moduleId: module.id, durationMinutes: -1 })).status, 400);
      assert.equal((await request('/lecturer/sessions', l.accessToken, { moduleId: module.id, geoValidationEnabled: true })).status, 400);
      for (const latitude of [null, '0', {}, 91]) assert.equal((await request('/attendance/scan', s.accessToken, { qrToken: session.qrString, latitude })).status, 400);
      const payload = JSON.parse(session.qrString); payload.signature = '0'.repeat(64);
      assert.equal((await request('/attendance/scan', s.accessToken, { qrToken: JSON.stringify(payload) })).status, 400);
      const future = { ...JSON.parse(session.qrString), timestamp: Date.now() + 10000 };
      future.signature = signPayload(`${future.sessionId}:${future.nonce}:${future.timestamp}`);
      assert.equal(QRService.validateQRToken(JSON.stringify(future)).isValid, false);
    });
    await t.test('rotated QR replay is rejected; duplicates cannot create records', async () => {
      const rotated = await request(`/lecturer/sessions/${session.session.id}/refresh-qr`, l.accessToken, {});
      assert.equal((await request('/attendance/scan', s.accessToken, { qrToken: session.qrString })).status, 400);
      session.qrString = rotated.body.data.qrString;
      const results = await Promise.all([1, 2].map(() => request('/attendance/scan', s.accessToken, { qrToken: session.qrString })));
      assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
    });
    await t.test('zero coordinates enforce location; stale, mocked and inaccurate fixes fail', async () => {
      const geo = await create({ geoValidationEnabled: true, latitude: 0, longitude: 0, allowedRadius: 100 });
      const body = { qrToken: geo.qrString, latitude: 0, longitude: 0, accuracy: 5, locationTimestamp: Date.now() };
      for (const extra of [{ latitude: 1 }, { mocked: true }, { accuracy: 500 }, { locationTimestamp: Date.now() - 60000 }]) assert.equal((await request('/attendance/scan', s.accessToken, { ...body, ...extra })).status, 400);
      assert.equal((await request('/attendance/scan', s.accessToken, body)).status, 201);
      const record = await prisma.attendanceRecord.findUnique({ where: { sessionId_studentId: { sessionId: geo.session.id, studentId: student.profile.id } } });
      assert.equal(record.latitude, 0); assert.equal(record.longitude, 0);
    });
    await t.test('close finalizes absences; override and audit are atomic; CSV is escaped', async () => {
      assert.equal((await request(`/lecturer/sessions/${session.session.id}/close`, l.accessToken, {})).status, 200);
      const record = await prisma.attendanceRecord.findUnique({ where: { sessionId_studentId: { sessionId: session.session.id, studentId: second.profile.id } } });
      assert.equal(record.attendanceStatus, 'ABSENT');
      assert.equal((await request(`/attendance/${record.id}/override`, o.accessToken, { newStatus: 'EXCUSED', reason: 'Medical note' }, 'PATCH')).status, 403);
      assert.equal((await request(`/attendance/${record.id}/override`, l.accessToken, { newStatus: 'EXCUSED', reason: 'Medical note' }, 'PATCH')).status, 200);
      assert.equal(await prisma.attendanceAuditLog.count({ where: { attendanceRecordId: record.id } }), 1);
      const csv = await request('/reports/module/' + module.id + '/export-csv', l.accessToken);
      assert.match(csv.body, /"'=HYPERLINK\(""unsafe""\)"/);
      assert.equal((await request('/attendance/scan', s2.accessToken, { qrToken: session.qrString })).status, 400);
    });
    await t.test('expiry sweep creates missing records and survives restarts', async () => {
      const expiring = await create();
      await prisma.attendanceSession.update({ where: { id: expiring.session.id }, data: { endTime: new Date(Date.now() - 1000) } });
      await expireSessions();
      assert.equal((await prisma.attendanceSession.findUnique({ where: { id: expiring.session.id } })).status, 'EXPIRED');
      assert.equal(await prisma.attendanceRecord.count({ where: { sessionId: expiring.session.id, attendanceStatus: 'ABSENT' } }), 2);
    });
    await t.test('students request corrections; only the owning lecturer resolves with an audit', async () => {
      const record = await prisma.attendanceRecord.findUnique({ where: { sessionId_studentId: { sessionId: session.session.id, studentId: second.profile.id } } });
      const body = { recordId: record.id, requestedStatus: 'PRESENT', reason: 'My camera failed during the class.' };
      assert.equal((await request('/attendance/reviews', s.accessToken, body)).status, 404);
      const review = await request('/attendance/reviews', s2.accessToken, body);
      assert.equal(review.status, 201);
      assert.equal((await request('/attendance/reviews', s2.accessToken, body)).status, 409);
      assert.equal((await request('/attendance/reviews', o.accessToken)).body.data.length, 0);
      const path = '/attendance/reviews/' + review.body.data.id;
      assert.equal((await request(path, s2.accessToken, { decision: 'APPROVED', reason: 'Self approval' }, 'PATCH')).status, 403);
      assert.equal((await request(path, o.accessToken, { decision: 'APPROVED', reason: 'Not my class' }, 'PATCH')).status, 404);
      assert.equal((await request(path, l.accessToken, { decision: 'APPROVED', reason: 'Verified classroom register' }, 'PATCH')).status, 200);
      assert.equal((await request(path, l.accessToken, { decision: 'REJECTED', reason: 'Duplicate resolution' }, 'PATCH')).status, 409);
      assert.equal((await prisma.attendanceRecord.findUnique({ where: { id: record.id } })).attendanceStatus, 'PRESENT');
      assert.equal(await prisma.attendanceAuditLog.count({ where: { attendanceRecordId: record.id } }), 2);
    });
    await t.test('concurrent close and scan leave exactly one record per enrollee', async () => {
      const racing = await create();
      const result = await Promise.all([request('/attendance/scan', s.accessToken, { qrToken: racing.qrString }), request(`/lecturer/sessions/${racing.session.id}/close`, l.accessToken, {})]);
      assert.ok([201, 400, 409].includes(result[0].status)); assert.equal(result[1].status, 200);
      assert.equal(await prisma.attendanceRecord.count({ where: { sessionId: racing.session.id } }), 2);
    });
    await t.test('refresh rotation, new-login revocation and logout', async () => {
      const refreshed = await request('/auth/refresh', null, { refreshToken: s.refreshToken });
      assert.equal(refreshed.status, 200);
      assert.equal((await request('/auth/refresh', null, { refreshToken: s.refreshToken })).status, 401);
      const newer = await login(student);
      assert.equal((await request('/auth/profile', refreshed.body.data.accessToken)).status, 401);
      assert.equal((await request('/auth/logout', newer.accessToken, {})).status, 200);
      assert.equal((await request('/auth/profile', newer.accessToken)).status, 401);
    });
    await t.test('password change validates old password and revokes tokens', async () => {
      const current = await login(student);
      assert.equal((await request('/auth/change-password', current.accessToken, { currentPassword: 'wrong', newPassword: 'A new password 123!' })).status, 400);
      assert.equal((await request('/auth/change-password', current.accessToken, { currentPassword: password, newPassword: 'A new password 123!' })).status, 200);
      assert.equal((await request('/auth/profile', current.accessToken)).status, 401);
    });
  } finally {
    // Remove only fixtures created by this run, even after a failed assertion.
    for (const module of modules) await prisma.module.delete({ where: { id: module.id } });
    for (const user of users) await prisma.user.delete({ where: { id: user.id } });
    if (department) await prisma.department.delete({ where: { id: department.id } });
    getIO().close(); httpServer.close();
    await prisma.$disconnect();
  }
});
