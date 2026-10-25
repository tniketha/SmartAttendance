const { client, db } = require("../config/database");

async function finalizeSession(sessionId, status = "CLOSED") {
  return client.withSession(async (transaction) =>
    transaction.withTransaction(async () => {
      const options = { session: transaction };
      const attendanceClass = await db
        .collection("attendance_sessions")
        .findOne({ _id: sessionId }, options);
      if (!attendanceClass || attendanceClass.status !== "ACTIVE")
        return attendanceClass;
      // Both closure and scanning write this class document, so they cannot race.
      await db
        .collection("attendance_sessions")
        .updateOne(
          { _id: sessionId },
          { $set: { status, updated_at: new Date() } },
          options,
        );
      const enrollments = await db
        .collection("enrollments")
        .find(
          {
            module_id: attendanceClass.module_id,
            enrolled_at: { $lte: attendanceClass.start_time },
          },
          options,
        )
        .toArray();
      const records = await db
        .collection("attendance_records")
        .find({ session_id: sessionId }, options)
        .toArray();
      const recorded = new Set(
        records.map((record) => String(record.student_id)),
      );
      const now = new Date();
      const missing = enrollments.filter(
        (enrollment) => !recorded.has(String(enrollment.student_id)),
      );
      if (missing.length)
        await db.collection("attendance_records").insertMany(
          missing.map((enrollment) => ({
            session_id: sessionId,
            student_id: enrollment.student_id,
            attendance_status: "ABSENT",
            scanned_at: null,
            created_at: now,
            updated_at: now,
          })),
          options,
        );
      return { ...attendanceClass, status };
    }),
  );
}
async function expireSessions() {
  const classes = await db
    .collection("attendance_sessions")
    .find({ status: "ACTIVE", end_time: { $lte: new Date() } })
    .toArray();
  for (const attendanceClass of classes)
    await finalizeSession(attendanceClass._id, "EXPIRED");
}
module.exports = { finalizeSession, expireSessions };
