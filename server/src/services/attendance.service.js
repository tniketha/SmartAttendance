const { db } = require("../config/database");
function summarize(records) {
  const total = records.length;
  const present = records.filter(
    (record) => record.attendance_status === "PRESENT",
  ).length;
  const late = records.filter(
    (record) => record.attendance_status === "LATE",
  ).length;
  const absent = records.filter(
    (record) => record.attendance_status === "ABSENT",
  ).length;
  return {
    total,
    present,
    late,
    absent,
    percentage: total ? Math.round(((present + late) / total) * 100) : 0,
  };
}
function moduleDetails(module) {
  return {
    id: String(module._id),
    moduleCode: module.module_code,
    moduleName: module.module_name,
    academicYear: module.academic_year,
    semester: module.semester,
  };
}
async function studentSubjects(studentId) {
  const enrollments = await db
    .collection("enrollments")
    .find({ student_id: studentId })
    .toArray();
  const subjects = [];
  for (const enrollment of enrollments) {
    const module = await db
      .collection("modules")
      .findOne({ _id: enrollment.module_id });
    if (!module) continue;
    const classes = await db
      .collection("attendance_sessions")
      .find({ module_id: module._id, status: { $ne: "ACTIVE" } })
      .toArray();
    const records = await db
      .collection("attendance_records")
      .find({
        student_id: studentId,
        session_id: { $in: classes.map((item) => item._id) },
      })
      .toArray();
    const lecturer = await db
      .collection("lecturers")
      .findOne({ _id: module.lecturer_id });
    const user =
      lecturer &&
      (await db.collection("users").findOne({ _id: lecturer.user_id }));
    const department = await db
      .collection("departments")
      .findOne({ _id: module.department_id });
    subjects.push({
      ...moduleDetails(module),
      lecturerName: user?.name || "",
      department: department?.name || "",
      stats: summarize(records),
    });
  }
  return subjects.sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));
}
module.exports = { summarize, moduleDetails, studentSubjects };
