const { randomBytes } = require("node:crypto");
const { db, ObjectId } = require("../config/database");
const {
  finalizeSession,
  expireSessions,
} = require("../services/session.service");
const { summarize, moduleDetails } = require("../services/attendance.service");
const { QRService } = require("../services/qr.service");
const { sendSuccess, HttpError } = require("../utils/response.utils");

function lecturerId(req) {
  if (!req.user.lecturerId)
    throw new HttpError("Lecturer profile missing.", 403);
  return req.user.lecturerId;
}
async function assignedClass(req) {
  const attendanceClass = await db
    .collection("attendance_sessions")
    .findOne({ _id: new ObjectId(req.params.id) });
  if (!attendanceClass) throw new HttpError("Class not found.", 404);
  if (String(attendanceClass.lecturer_id) !== String(lecturerId(req)))
    throw new HttpError("This class is not assigned to you.", 403);
  return attendanceClass;
}
const LecturerController = {
  async getModules(req, res) {
    const modules = await db
      .collection("modules")
      .find({ lecturer_id: lecturerId(req) })
      .sort({ module_code: 1 })
      .toArray();
    const result = [];
    for (const module of modules) {
      const department = await db
        .collection("departments")
        .findOne({ _id: module.department_id });
      const enrolledCount = await db
        .collection("enrollments")
        .countDocuments({ module_id: module._id });
      const sessionCount = await db
        .collection("attendance_sessions")
        .countDocuments({ module_id: module._id });
      result.push({
        ...moduleDetails(module),
        department: department?.name || "",
        enrolledCount,
        sessionCount,
      });
    }
    sendSuccess(res, result);
  },
  async getDashboard(req, res) {
    await expireSessions();
    const id = lecturerId(req);
    const modules = await db
      .collection("modules")
      .find({ lecturer_id: id })
      .toArray();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const classes = await db
      .collection("attendance_sessions")
      .find({ lecturer_id: id, session_date: { $gte: start, $lte: end } })
      .sort({ start_time: -1 })
      .toArray();
    const completed = await db
      .collection("attendance_sessions")
      .find({ lecturer_id: id, status: { $ne: "ACTIVE" } })
      .toArray();
    const records = await db
      .collection("attendance_records")
      .find({ session_id: { $in: completed.map((item) => item._id) } })
      .toArray();
    const todaySessions = [];
    for (const attendanceClass of classes) {
      const module = modules.find((item) =>
        item._id.equals(attendanceClass.module_id),
      );
      if (!module) continue;
      const totalScanned = await db
        .collection("attendance_records")
        .countDocuments({
          session_id: attendanceClass._id,
          attendance_status: { $in: ["PRESENT", "LATE"] },
        });
      todaySessions.push({
        ...moduleDetails(module),
        id: String(attendanceClass._id),
        sessionCode: attendanceClass.session_code,
        status: attendanceClass.status,
        startTime: attendanceClass.start_time,
        endTime: attendanceClass.end_time,
        totalScanned,
      });
    }
    const moduleList = [];
    for (const module of modules)
      moduleList.push({
        ...moduleDetails(module),
        enrolledCount: await db
          .collection("enrollments")
          .countDocuments({ module_id: module._id }),
      });
    sendSuccess(res, {
      totalModules: modules.length,
      todaySessionsCount: classes.length,
      averageAttendanceRate: summarize(records).percentage,
      modules: moduleList,
      todaySessions,
    });
  },
  async createSession(req, res) {
    const id = lecturerId(req);
    const { moduleId, durationMinutes, lateThresholdMinutes } = req.body;
    const module = await db
      .collection("modules")
      .findOne({ _id: new ObjectId(moduleId), lecturer_id: id });
    if (!module)
      throw new HttpError("This module is not assigned to you.", 403);
    const now = new Date();
    const result = await db
      .collection("attendance_sessions")
      .insertOne({
        module_id: module._id,
        lecturer_id: id,
        session_code: `${module.module_code}-${randomBytes(4).toString("hex")}`,
        session_date: now,
        start_time: now,
        end_time: new Date(now.getTime() + durationMinutes * 60000),
        late_threshold_time: new Date(
          now.getTime() + lateThresholdMinutes * 60000,
        ),
        current_qr_token: QRService.createToken(),
        status: "ACTIVE",
        created_at: now,
        updated_at: now,
      });
    sendSuccess(
      res,
      { session: { id: String(result.insertedId) } },
      "Class started.",
      201,
    );
  },
  async getSession(req, res) {
    await expireSessions();
    const attendanceClass = await assignedClass(req);
    const module = await db
      .collection("modules")
      .findOne({ _id: attendanceClass.module_id });
    const enrollments = await db
      .collection("enrollments")
      .find({
        module_id: module._id,
        enrolled_at: { $lte: attendanceClass.start_time },
      })
      .toArray();
    const records = await db
      .collection("attendance_records")
      .find({ session_id: attendanceClass._id })
      .toArray();
    const students = [];
    for (const enrollment of enrollments) {
      const student = await db
        .collection("students")
        .findOne({ _id: enrollment.student_id });
      if (!student) continue;
      const user = await db
        .collection("users")
        .findOne({ _id: student.user_id });
      const record = records.find((item) =>
        item.student_id.equals(student._id),
      );
      students.push({
        studentId: String(student._id),
        studentNumber: student.student_number,
        name: user?.name || "",
        status: record?.attendance_status || null,
        scannedAt: record?.scanned_at || null,
      });
    }
    students.sort((a, b) => a.studentNumber.localeCompare(b.studentNumber));
    const summary = summarize(records);
    sendSuccess(res, {
      session: {
        ...moduleDetails(module),
        id: String(attendanceClass._id),
        status: attendanceClass.status,
        startTime: attendanceClass.start_time,
        endTime: attendanceClass.end_time,
      },
      qrString:
        attendanceClass.status === "ACTIVE"
          ? QRService.createPayload(
              attendanceClass._id,
              attendanceClass.current_qr_token,
            )
          : null,
      counts: {
        totalEnrolled: students.length,
        checkedIn: summary.present + summary.late,
        present: summary.present,
        late: summary.late,
        absent: summary.absent,
      },
      students,
    });
  },
  async closeSession(req, res) {
    const attendanceClass = await assignedClass(req);
    await finalizeSession(
      attendanceClass._id,
      attendanceClass.end_time <= new Date() ? "EXPIRED" : "CLOSED",
    );
    sendSuccess(
      res,
      null,
      "Class ended. Missing students have been marked absent.",
    );
  },
};
module.exports = { LecturerController };
