const { client, db, ObjectId } = require("../config/database");
const { QRService } = require("../services/qr.service");
const { finalizeSession } = require("../services/session.service");
const { sendSuccess, HttpError } = require("../utils/response.utils");
const AttendanceController = {
  async scanAttendance(req, res) {
    const payload = QRService.parsePayload(req.body.qrToken);
    if (!payload) throw new HttpError("Invalid attendance QR code.");
    const studentId = req.user.studentId;
    if (!studentId) throw new HttpError("Student profile missing.", 403);
    const sessionId = new ObjectId(payload.sessionId);
    const attendanceClass = await db
      .collection("attendance_sessions")
      .findOne({ _id: sessionId });
    if (!attendanceClass || attendanceClass.current_qr_token !== payload.token)
      throw new HttpError("Invalid attendance QR code.");
    if (
      attendanceClass.status === "ACTIVE" &&
      attendanceClass.end_time <= new Date()
    )
      await finalizeSession(sessionId, "EXPIRED");
    const result = await client.withSession(async (transaction) =>
      transaction.withTransaction(async () => {
        const options = { session: transaction };
        const current = await db
          .collection("attendance_sessions")
          .findOne({ _id: sessionId }, options);
        const now = new Date();
        if (!current || current.status !== "ACTIVE" || current.end_time <= now)
          throw new HttpError("This class has ended.");
        const enrollment = await db
          .collection("enrollments")
          .findOne(
            {
              student_id: studentId,
              module_id: current.module_id,
              enrolled_at: { $lte: current.start_time },
            },
            options,
          );
        if (!enrollment)
          throw new HttpError("You are not enrolled in this module.", 403);
        await db
          .collection("attendance_sessions")
          .updateOne(
            { _id: sessionId },
            { $set: { updated_at: now }, $inc: { attendance_version: 1 } },
            options,
          );
        const status =
          current.late_threshold_time && now > current.late_threshold_time
            ? "LATE"
            : "PRESENT";
        const record = await db
          .collection("attendance_records")
          .insertOne(
            {
              session_id: sessionId,
              student_id: studentId,
              attendance_status: status,
              scanned_at: now,
              created_at: now,
              updated_at: now,
            },
            options,
          );
        return {
          recordId: String(record.insertedId),
          status,
          scannedAt: now,
          moduleId: current.module_id,
        };
      }),
    );
    const module = await db
      .collection("modules")
      .findOne({ _id: result.moduleId });
    sendSuccess(
      res,
      {
        recordId: result.recordId,
        status: result.status,
        scannedAt: result.scannedAt,
        moduleCode: module.module_code,
        moduleName: module.module_name,
      },
      "Attendance recorded.",
      201,
    );
  },
};
module.exports = { AttendanceController };
