const { db, ObjectId } = require("../config/database");
const { expireSessions } = require("../services/session.service");
const { summarize, moduleDetails } = require("../services/attendance.service");
const { sendSuccess, HttpError } = require("../utils/response.utils");

async function assignedModule(req) {
  const module = await db
    .collection("modules")
    .findOne({ _id: new ObjectId(req.params.moduleId) });
  if (!module) throw new HttpError("Module not found.", 404);
  if (String(module.lecturer_id) !== String(req.user.lecturerId))
    throw new HttpError("This module is not assigned to you.", 403);
  return module;
}
function csvCell(value) {
  const text = String(value);
  return (
    '"' +
    (/^[\s]*[=+@\-\t\r]/.test(text) ? "'" : "") +
    text.replace(/"/g, '""') +
    '"'
  );
}
const ReportController = {
  async getModuleReport(req, res) {
    await expireSessions();
    const module = await assignedModule(req);
    const department = await db
      .collection("departments")
      .findOne({ _id: module.department_id });
    const lecturer = await db
      .collection("lecturers")
      .findOne({ _id: module.lecturer_id });
    const lecturerUser =
      lecturer &&
      (await db.collection("users").findOne({ _id: lecturer.user_id }));
    const enrollments = await db
      .collection("enrollments")
      .find({ module_id: module._id })
      .toArray();
    const classes = await db
      .collection("attendance_sessions")
      .find({ module_id: module._id, status: { $ne: "ACTIVE" } })
      .sort({ session_date: -1 })
      .toArray();
    const records = await db
      .collection("attendance_records")
      .find({ session_id: { $in: classes.map((item) => item._id) } })
      .toArray();
    const studentStats = [];
    for (const enrollment of enrollments) {
      const student = await db
        .collection("students")
        .findOne({ _id: enrollment.student_id });
      if (!student) continue;
      const user = await db
        .collection("users")
        .findOne({ _id: student.user_id });
      const eligible = classes.filter(
        (item) => item.start_time >= enrollment.enrolled_at,
      );
      const eligibleIds = new Set(eligible.map((item) => String(item._id)));
      const summary = summarize(
        records.filter(
          (record) =>
            record.student_id.equals(student._id) &&
            eligibleIds.has(String(record.session_id)),
        ),
      );
      studentStats.push({
        studentId: String(student._id),
        studentNumber: student.student_number,
        studentName: user?.name || "",
        programme: student.programme,
        totalSessions: eligible.length,
        present: summary.present,
        late: summary.late,
        absent: summary.absent,
        percentage: eligible.length
          ? Math.round(
              ((summary.present + summary.late) / eligible.length) * 100,
            )
          : 0,
      });
    }
    studentStats.sort((a, b) => a.studentNumber.localeCompare(b.studentNumber));
    const sessionStats = classes.map((item) => {
      const summary = summarize(
        records.filter((record) => record.session_id.equals(item._id)),
      );
      return {
        sessionId: String(item._id),
        sessionCode: item.session_code,
        date: item.session_date,
        status: item.status,
        total: summary.total,
        present: summary.present,
        late: summary.late,
        absent: summary.absent,
        rate: summary.percentage,
      };
    });
    sendSuccess(res, {
      module: {
        ...moduleDetails(module),
        department: department?.name || "",
        lecturerName: lecturerUser?.name || "",
        totalEnrolled: enrollments.length,
        totalSessions: classes.length,
      },
      sessionStats,
      studentStats,
    });
  },
  async exportModuleCSV(req, res) {
    await expireSessions();
    const module = await assignedModule(req);
    const classes = await db
      .collection("attendance_sessions")
      .find({ module_id: module._id })
      .sort({ session_date: -1 })
      .toArray();
    const rows = [
      [
        "Session Code",
        "Date",
        "Student ID",
        "Student Name",
        "Status",
        "Scanned At",
      ].join(","),
    ];
    for (const attendanceClass of classes) {
      const records = await db
        .collection("attendance_records")
        .find({ session_id: attendanceClass._id })
        .sort({ student_id: 1 })
        .toArray();
      for (const record of records) {
        const student = await db
          .collection("students")
          .findOne({ _id: record.student_id });
        if (!student) continue;
        const user = await db
          .collection("users")
          .findOne({ _id: student.user_id });
        rows.push(
          [
            attendanceClass.session_code,
            attendanceClass.session_date.toISOString().slice(0, 10),
            student.student_number,
            user?.name || "",
            record.attendance_status,
            record.scanned_at?.toISOString() || "N/A",
          ]
            .map(csvCell)
            .join(","),
        );
      }
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_${module.module_code.replace(/[^a-z0-9_-]/gi, "_")}_${Date.now()}.csv`,
    );
    res.status(200).send(rows.join("\n"));
  },
};
module.exports = { ReportController };
