// Synthetic attendance for the named local portfolio database only.
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const databaseURL = process.env.DATABASE_URL;
const url = databaseURL && new URL(databaseURL);
if (
  !url ||
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/smart_attendance_portfolio" ||
  process.env.ALLOW_DEMO_RESET !== "true" ||
  process.env.NODE_ENV === "production"
)
  throw new Error(
    "Use a local smart_attendance_portfolio database and ALLOW_DEMO_RESET=true. Its demo collections will be reset.",
  );
const server = path.resolve(__dirname, "../server");
const seeded = spawnSync(process.execPath, ["scripts/seed-demo.cjs"], {
  cwd: server,
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
});
if (seeded.status !== 0) process.exit(seeded.status || 1);
const {
  db,
  client,
  connectDatabase,
} = require("../server/src/config/database");
const { randomBytes } = require("node:crypto");
(async () => {
  await connectDatabase();
  const now = new Date();
  const modules = await db
    .collection("modules")
    .find()
    .sort({ module_code: 1 })
    .toArray();
  const students = await db
    .collection("students")
    .find()
    .sort({ student_number: 1 })
    .toArray();
  await db
    .collection("enrollments")
    .updateMany(
      {},
      { $set: { enrolled_at: new Date(now.getTime() - 365 * 86400000) } },
    );
  for (let m = 0; m < modules.length; m++) {
    const module = modules[m];
    for (let week = 0; week < 6; week++) {
      const start = new Date(now);
      start.setDate(
        start.getDate() -
          (week * 4 + (m % 6) + 1 + (module.semester === 1 ? 150 : 0)),
      );
      start.setHours(9 + (m % 3) * 2, 0, 0, 0);
      const result = await db
        .collection("attendance_sessions")
        .insertOne({
          module_id: module._id,
          lecturer_id: module.lecturer_id,
          session_code: `DEMO-${module.module_code}-${week + 1}`,
          session_date: start,
          start_time: start,
          end_time: new Date(start.getTime() + 3600000),
          current_qr_token: randomBytes(24).toString("hex"),
          status: "CLOSED",
          created_at: now,
          updated_at: now,
        });
      const records = students.map((student, s) => {
        const value = (week * 3 + s + m * 2) % 10;
        const status =
          value === 0 ? "ABSENT" : value === 1 ? "LATE" : "PRESENT";
        return {
          session_id: result.insertedId,
          student_id: student._id,
          attendance_status: status,
          scanned_at:
            status === "ABSENT"
              ? null
              : new Date(
                  start.getTime() + (status === "LATE" ? 12 : 2) * 60000,
                ),
          created_at: now,
          updated_at: now,
        };
      });
      await db.collection("attendance_records").insertMany(records);
    }
  }
  const module = modules.find((item) => item.module_code === "CSC3213");
  const start = new Date(now.getTime() - 10 * 60000);
  const result = await db
    .collection("attendance_sessions")
    .insertOne({
      module_id: module._id,
      lecturer_id: module.lecturer_id,
      session_code: `DEMO-${module.module_code}-DEMO`,
      session_date: now,
      start_time: start,
      end_time: new Date(now.getTime() + 120 * 60000),
      late_threshold_time: new Date(now.getTime() - 5 * 60000),
      current_qr_token: randomBytes(24).toString("hex"),
      status: "ACTIVE",
      created_at: now,
      updated_at: now,
    });
  await db
    .collection("attendance_records")
    .insertMany(
      students
        .slice(0, 7)
        .map((student, i) => ({
          session_id: result.insertedId,
          student_id: student._id,
          attendance_status: i === 6 ? "LATE" : "PRESENT",
          scanned_at: new Date(start.getTime() + (i === 6 ? 7 : 2) * 60000),
          created_at: now,
          updated_at: now,
        })),
    );
  console.log(
    "Demo ready: 72 completed classes across two semesters and one active class.",
  );
})()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => client.close());
