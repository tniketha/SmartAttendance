const { MongoClient, ObjectId } = require("mongodb");
require("./env");

if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL in server/.env.");
const client = new MongoClient(process.env.DATABASE_URL, {
  serverSelectionTimeoutMS: 10000,
});
const db = client.db();

async function connectDatabase() {
  await client.connect();
  // Unique indexes enforce one profile, one enrollment and one check-in.
  await db
    .collection("users")
    .createIndex({ email: 1 }, { unique: true, name: "users_email_key" });
  for (const [collection, field] of [
    ["students", "student_number"],
    ["lecturers", "employee_number"],
  ]) {
    await db
      .collection(collection)
      .createIndex(
        { user_id: 1 },
        { unique: true, name: `${collection}_user_id_key` },
      );
    await db
      .collection(collection)
      .createIndex(
        { [field]: 1 },
        { unique: true, name: `${collection}_${field}_key` },
      );
  }
  await db
    .collection("departments")
    .createIndex({ code: 1 }, { unique: true, name: "departments_code_key" });
  await db
    .collection("modules")
    .createIndex(
      { module_code: 1 },
      { unique: true, name: "modules_module_code_key" },
    );
  await db
    .collection("enrollments")
    .createIndex(
      { student_id: 1, module_id: 1 },
      { unique: true, name: "enrollments_student_id_module_id_key" },
    );
  await db
    .collection("attendance_sessions")
    .createIndex(
      { session_code: 1 },
      { unique: true, name: "attendance_sessions_session_code_key" },
    );
  await db
    .collection("attendance_sessions")
    .createIndex(
      { module_id: 1, status: 1 },
      { name: "attendance_sessions_module_id_status_idx" },
    );
  await db
    .collection("attendance_records")
    .createIndex(
      { session_id: 1, student_id: 1 },
      { unique: true, name: "attendance_records_session_id_student_id_key" },
    );
  await db.collection("attendance_records").createIndex({ student_id: 1 });
  return db;
}

module.exports = { client, db, ObjectId, connectDatabase };
