const { db, ObjectId } = require("../config/database");
const { expireSessions } = require("../services/session.service");
const {
  studentSubjects,
  moduleDetails,
} = require("../services/attendance.service");
const { sendSuccess, HttpError } = require("../utils/response.utils");

function studentId(req) {
  if (!req.user.studentId)
    throw new HttpError("Student profile not linked.", 403);
  return req.user.studentId;
}
function totals(subjects) {
  const result = {
    totalClasses: 0,
    totalPresent: 0,
    totalLate: 0,
    totalAbsent: 0,
  };
  for (const subject of subjects) {
    result.totalClasses += subject.stats.total;
    result.totalPresent += subject.stats.present;
    result.totalLate += subject.stats.late;
    result.totalAbsent += subject.stats.absent;
  }
  result.overallPercentage = result.totalClasses
    ? Math.round(
        ((result.totalPresent + result.totalLate) / result.totalClasses) * 100,
      )
    : 0;
  return result;
}
const StudentController = {
  async getDashboard(req, res) {
    await expireSessions();
    const id = studentId(req);
    const subjects = await studentSubjects(id);
    const summary = totals(subjects);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const classes = await db
      .collection("attendance_sessions")
      .find({
        module_id: { $in: subjects.map((subject) => new ObjectId(subject.id)) },
        session_date: { $gte: start, $lte: end },
      })
      .sort({ start_time: 1 })
      .toArray();
    const todaySessions = [];
    for (const attendanceClass of classes) {
      const module = subjects.find(
        (subject) => subject.id === String(attendanceClass.module_id),
      );
      const record = await db
        .collection("attendance_records")
        .findOne({ session_id: attendanceClass._id, student_id: id });
      todaySessions.push({
        id: String(attendanceClass._id),
        sessionCode: attendanceClass.session_code,
        moduleCode: module.moduleCode,
        moduleName: module.moduleName,
        academicYear: module.academicYear,
        semester: module.semester,
        startTime: attendanceClass.start_time,
        endTime: attendanceClass.end_time,
        status: attendanceClass.status,
        userAttendanceStatus: record?.attendance_status || null,
        hasMarked: Boolean(record),
      });
    }
    sendSuccess(res, {
      stats: {
        overallPercentage: summary.overallPercentage,
        totalClasses: summary.totalClasses,
        presentCount: summary.totalPresent,
        lateCount: summary.totalLate,
        absentCount: summary.totalAbsent,
        enrolledModulesCount: subjects.length,
      },
      todaySessions,
    });
  },
  async getModules(req, res) {
    await expireSessions();
    sendSuccess(res, await studentSubjects(studentId(req)));
  },
  async getStatistics(req, res) {
    await expireSessions();
    const subjects = await studentSubjects(studentId(req));
    sendSuccess(res, {
      ...totals(subjects),
      subjectWise: subjects.map((subject) => ({
        moduleCode: subject.moduleCode,
        moduleName: subject.moduleName,
        academicYear: subject.academicYear,
        semester: subject.semester,
        ...subject.stats,
      })),
    });
  },
  async getAttendanceHistory(req, res) {
    await expireSessions();
    const id = studentId(req);
    const { status, moduleId } = req.query;
    if (
      (status && !["PRESENT", "LATE", "ABSENT"].includes(status)) ||
      (moduleId &&
        (typeof moduleId !== "string" || !/^[a-f0-9]{24}$/i.test(moduleId)))
    )
      throw new HttpError("Invalid attendance filter.");
    const filter = { student_id: id };
    if (status) filter.attendance_status = status;
    const records = await db
      .collection("attendance_records")
      .find(filter)
      .toArray();
    const history = [];
    for (const record of records) {
      const attendanceClass = await db
        .collection("attendance_sessions")
        .findOne({ _id: record.session_id });
      if (
        !attendanceClass ||
        (moduleId && String(attendanceClass.module_id) !== moduleId)
      )
        continue;
      const module = await db
        .collection("modules")
        .findOne({ _id: attendanceClass.module_id });
      if (!module) continue;
      const lecturer = await db
        .collection("lecturers")
        .findOne({ _id: attendanceClass.lecturer_id });
      const user =
        lecturer &&
        (await db.collection("users").findOne({ _id: lecturer.user_id }));
      history.push({
        ...moduleDetails(module),
        id: String(record._id),
        sessionId: String(attendanceClass._id),
        lecturerName: user?.name || "",
        sessionDate: attendanceClass.session_date,
        startTime: attendanceClass.start_time,
        scannedAt: record.scanned_at || null,
        status: record.attendance_status,
      });
    }
    history.sort((a, b) => b.startTime - a.startTime);
    sendSuccess(res, history);
  },
};
module.exports = { StudentController };
