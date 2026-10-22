// Synthetic data for screenshots. Refuse every database except the named local demo.
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const server = path.resolve(__dirname, '../server');
const databaseURL = process.env.DATABASE_URL;
const url = databaseURL && new URL(databaseURL);
if (!url || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/smart_attendance_portfolio' || process.env.ALLOW_DEMO_RESET !== 'true' || process.env.NODE_ENV === 'production') {
  throw new Error('Use a local smart_attendance_portfolio database and ALLOW_DEMO_RESET=true. Existing demo data in that database will be reset.');
}
const seeded = spawnSync(process.execPath, ['prisma/seed-mongo.js'], {
  cwd: server,
  env: { ...process.env, DATABASE_URL: databaseURL },
  stdio: 'inherit',
  windowsHide: true,
});
if (seeded.status !== 0) process.exit(seeded.status || 1);
const { PrismaClient } = require(path.join(server, 'node_modules/@prisma/client'));
const prisma = new PrismaClient({ datasources: { db: { url: databaseURL } } });

(async () => {
  const now = new Date();
  const modules = await prisma.module.findMany({ orderBy: { moduleCode: 'asc' } });
  const students = await prisma.student.findMany({ orderBy: { studentNumber: 'asc' } });
  await prisma.enrollment.updateMany({ data: { enrolledAt: new Date(now.getTime() - 365 * 86400000) } });
  await prisma.user.updateMany({ data: { sessionVersion: 0, refreshTokenHash: null } });
  for (let m = 0; m < modules.length; m++) {
    const module = modules[m];
    for (let week = 0; week < 6; week++) {
      const startTime = new Date(now);
      startTime.setDate(startTime.getDate() - (week * 4 + (m % 6) + 1 + (module.semester === 1 ? 150 : 0)));
      startTime.setHours(9 + (m % 3) * 2, 0, 0, 0);
      const session = await prisma.attendanceSession.create({ data: {
        moduleId: module.id, lecturerId: module.lecturerId,
        sessionCode: `DEMO-${module.moduleCode}-${week + 1}`,
        sessionDate: startTime, startTime,
        endTime: new Date(startTime.getTime() + 3600000),
        currentQrToken: 'expired-demo-token', tokenExpiry: startTime,
        status: 'CLOSED', geoValidationEnabled: false,
      } });
      for (let s = 0; s < students.length; s++) {
        const value = (week * 3 + s + m * 2) % 10;
        const attendanceStatus = value === 0 ? 'ABSENT' : value === 1 ? 'LATE' : 'PRESENT';
        await prisma.attendanceRecord.create({ data: {
          sessionId: session.id, studentId: students[s].id, attendanceStatus,
          scannedAt: attendanceStatus === 'ABSENT' ? null : new Date(startTime.getTime() + (attendanceStatus === 'LATE' ? 12 : 2) * 60000),
        } });
      }
    }
  }
  const corrected = await prisma.attendanceRecord.findFirst({
    where: { studentId: students[9].id, attendanceStatus: 'ABSENT' },
    orderBy: { id: 'asc' },
  });
  if (corrected) {
    const lecturer = await prisma.lecturer.findUniqueOrThrow({ where: { id: modules[0].lecturerId } });
    await prisma.$transaction([
      prisma.attendanceRecord.update({ where: { id: corrected.id }, data: { attendanceStatus: 'EXCUSED' } }),
      prisma.attendanceAuditLog.create({ data: {
        attendanceRecordId: corrected.id, changedById: lecturer.userId,
        oldStatus: 'ABSENT', newStatus: 'EXCUSED',
        reason: 'Approved after checking the classroom register (demo record).',
      } }),
    ]);
  }
  const module = modules.find(m => m.moduleCode === 'CSC3213') || modules[0];
  const startTime = new Date(now.getTime() - 10 * 60000);
  const live = await prisma.attendanceSession.create({ data: {
    moduleId: module.id, lecturerId: module.lecturerId,
    sessionCode: `DEMO-${module.moduleCode}-LIVE`, sessionDate: now, startTime,
    endTime: new Date(now.getTime() + 120 * 60000),
    lateThresholdTime: new Date(now.getTime() - 5 * 60000),
    currentQrToken: 'awaiting-live-refresh', tokenExpiry: now,
    status: 'ACTIVE', geoValidationEnabled: false,
  } });
  for (let s = 0; s < 7; s++) {
    await prisma.attendanceRecord.create({ data: {
      sessionId: live.id, studentId: students[s].id,
      attendanceStatus: s === 6 ? 'LATE' : 'PRESENT',
      scannedAt: new Date(startTime.getTime() + (s === 6 ? 7 : 2) * 60000),
    } });
  }
  console.log('Portfolio fixtures ready: 72 completed sessions across two semesters and one live session. All records are synthetic.');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
