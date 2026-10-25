const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const bcrypt = require("bcrypt");

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "mongodb://127.0.0.1:27019/attendance_security_test?replicaSet=attendance-test";
if (new URL(process.env.DATABASE_URL).pathname !== "/attendance_security_test")
  throw new Error("Use only the dedicated attendance_security_test database.");
const { db, client, ObjectId } = require("../src/config/database");
const { startServer } = require("../src/index");

test("attendance workflow with direct database queries", async (t) => {
  const server = await startServer(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const suffix = randomUUID().slice(0, 8);
  const password = "Student test password 123";
  const users = [];
  let department;
  let course;
  async function insert(collection, data) {
    const document = { _id: new ObjectId(), ...data };
    await db.collection(collection).insertOne(document);
    return document;
  }
  async function request(path, token, body) {
    const response = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, data: await response.json() };
  }
  async function createUser(role, label) {
    const user = await insert("users", {
      email: `${suffix}-${label.toLowerCase().replace(/\s/g, "-")}@example.com`,
      name: label,
      role,
      is_active: true,
      tokenHash: null,
      password_hash: await bcrypt.hash(password, 4),
    });
    users.push(user);
    const profile = await insert(
      role === "LECTURER" ? "lecturers" : "students",
      {
        user_id: user._id,
        department_id: department._id,
        ...(role === "LECTURER"
          ? { employee_number: suffix + label, title: "Lecturer" }
          : {
              student_number: suffix + label,
              programme: "Computer Science",
              academic_year: "Year 3",
              batch: "Demo",
            }),
      },
    );
    const login = await request("/auth/login", null, {
      identifier: user.email,
      password,
    });
    assert.equal(login.status, 200);
    return { user, profile, token: login.data.data.accessToken };
  }
  try {
    department = await insert("departments", {
      code: suffix,
      name: `Test department ${suffix}`,
    });
    const lecturer = await createUser("LECTURER", "Lecturer");
    const otherLecturer = await createUser("LECTURER", "Other lecturer");
    const student = await createUser("STUDENT", "Nikky");
    const absentStudent = await createUser("STUDENT", "Kavitha");
    const unenrolled = await createUser("STUDENT", "Arul");
    course = await insert("modules", {
      module_code: suffix,
      module_name: "Computer Graphics",
      academic_year: "Year 3",
      semester: 1,
      department_id: department._id,
      lecturer_id: lecturer.profile._id,
    });
    for (const person of [student, absentStudent])
      await insert("enrollments", {
        student_id: person.profile._id,
        module_id: course._id,
        enrolled_at: new Date(Date.now() - 60000),
      });
    const payload = {
      moduleId: String(course._id),
      durationMinutes: 10,
      lateThresholdMinutes: 5,
    };
    async function createClass(extra = {}) {
      const created = await request("/lecturer/sessions", lecturer.token, {
        ...payload,
        ...extra,
      });
      assert.equal(created.status, 201);
      const id = created.data.data.session.id;
      const details = await request(`/lecturer/sessions/${id}`, lecturer.token);
      assert.equal(details.status, 200);
      return { id, qrToken: details.data.data.qrString };
    }
    let attendanceClass;
    await t.test("sign-in, profiles, roles and validation", async () => {
      assert.equal((await request("/student/dashboard")).status, 401);
      assert.equal(
        (await request("/lecturer/modules", student.token)).status,
        403,
      );
      assert.equal(
        (await request("/student/dashboard", lecturer.token)).status,
        403,
      );
      assert.equal(
        (
          await request("/auth/login", null, {
            identifier: student.user.email,
            password: "wrong",
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await request("/lecturer/sessions", lecturer.token, {
            ...payload,
            lateThresholdMinutes: 11,
          })
        ).status,
        400,
      );
      assert.equal(
        (await request("/lecturer/sessions/not-an-id", lecturer.token)).status,
        400,
      );
      assert.equal(
        (await request("/auth/profile", student.token)).data.data.student
          .programme,
        "Computer Science",
      );
      attendanceClass = await createClass();
    });
    await t.test(
      "lecturer ownership protects classes and reports",
      async () => {
        assert.equal(
          (
            await request(
              `/lecturer/sessions/${attendanceClass.id}`,
              otherLecturer.token,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              `/lecturer/sessions/${attendanceClass.id}/close`,
              otherLecturer.token,
              {},
            )
          ).status,
          403,
        );
        assert.equal(
          (await request(`/reports/module/${course._id}`, otherLecturer.token))
            .status,
          403,
        );
        assert.equal(
          (
            await request(
              `/reports/module/${course._id}/export-csv`,
              student.token,
            )
          ).status,
          403,
        );
      },
    );
    await t.test(
      "QR validation, enrollment and simultaneous duplicate scans",
      async () => {
        const tampered = JSON.stringify({
          ...JSON.parse(attendanceClass.qrToken),
          token: "0".repeat(48),
        });
        assert.equal(
          (
            await request("/attendance/scan", student.token, {
              qrToken: tampered,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request("/attendance/scan", unenrolled.token, {
              qrToken: attendanceClass.qrToken,
            })
          ).status,
          403,
        );
        const scans = await Promise.all([
          request("/attendance/scan", student.token, {
            qrToken: attendanceClass.qrToken,
          }),
          request("/attendance/scan", student.token, {
            qrToken: attendanceClass.qrToken,
          }),
        ]);
        assert.deepEqual(
          scans.map((result) => result.status).sort(),
          [201, 409],
        );
        assert.equal(
          await db
            .collection("attendance_records")
            .countDocuments({
              session_id: new ObjectId(attendanceClass.id),
              student_id: student.profile._id,
            }),
          1,
        );
        assert.equal(
          (await request("/student/dashboard", student.token)).data.data.stats
            .totalClasses,
          0,
        );
      },
    );
    await t.test(
      "closing marks eligible absences and is safe to repeat",
      async () => {
        assert.equal(
          (
            await request(
              `/lecturer/sessions/${attendanceClass.id}/close`,
              lecturer.token,
              {},
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request(
              `/lecturer/sessions/${attendanceClass.id}/close`,
              lecturer.token,
              {},
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await request("/attendance/scan", absentStudent.token, {
              qrToken: attendanceClass.qrToken,
            })
          ).status,
          400,
        );
        const missing = await db
          .collection("attendance_records")
          .findOne({
            session_id: new ObjectId(attendanceClass.id),
            student_id: absentStudent.profile._id,
          });
        assert.equal(missing.attendance_status, "ABSENT");
      },
    );
    await t.test(
      "student history, semester statistics, modules and CSV reports",
      async () => {
        const stats = await request(
          "/student/attendance/statistics",
          student.token,
        );
        assert.equal(stats.data.data.totalClasses, 1);
        assert.equal(stats.data.data.overallPercentage, 100);
        assert.equal(stats.data.data.subjectWise[0].semester, 1);
        const history = await request(
          "/student/attendance/history?status=PRESENT",
          student.token,
        );
        assert.equal(history.data.data[0].sessionId, attendanceClass.id);
        assert.equal(history.data.data[0].semester, 1);
        const modules = await request("/student/modules", student.token);
        assert.equal(modules.data.data[0].lecturerName, "Lecturer");
        const report = await request(
          `/reports/module/${course._id}`,
          lecturer.token,
        );
        assert.equal(report.data.data.module.totalSessions, 1);
        assert.equal(report.data.data.module.semester, 1);
        assert.equal(report.data.data.studentStats.length, 2);
        await db
          .collection("users")
          .updateOne(
            { _id: student.user._id },
            { $set: { name: '=HYPERLINK("demo")' } },
          );
        const csv = await fetch(
          base + `/reports/module/${course._id}/export-csv`,
          { headers: { Authorization: `Bearer ${lecturer.token}` } },
        );
        assert.equal(csv.status, 200);
        const text = await csv.text();
        assert.match(text, /Student ID/);
        assert.ok(text.includes("'=HYPERLINK"));
      },
    );
    await t.test(
      "late attendance, expiry and enrollment after class start",
      async () => {
        const late = await createClass({ lateThresholdMinutes: 0 });
        assert.equal(
          (
            await request("/attendance/scan", student.token, {
              qrToken: late.qrToken,
            })
          ).data.data.status,
          "LATE",
        );
        await insert("enrollments", {
          student_id: unenrolled.profile._id,
          module_id: course._id,
          enrolled_at: new Date(Date.now() + 60000),
        });
        assert.equal(
          (
            await request("/attendance/scan", unenrolled.token, {
              qrToken: late.qrToken,
            })
          ).status,
          403,
        );
        await db
          .collection("attendance_sessions")
          .updateOne(
            { _id: new ObjectId(late.id) },
            { $set: { end_time: new Date(Date.now() - 1000) } },
          );
        const expired = await request(
          `/lecturer/sessions/${late.id}`,
          lecturer.token,
        );
        assert.equal(expired.data.data.session.status, "EXPIRED");
        assert.equal(expired.data.data.qrString, null);
        assert.equal(
          await db
            .collection("attendance_records")
            .countDocuments({
              session_id: new ObjectId(late.id),
              student_id: unenrolled.profile._id,
            }),
          0,
        );
      },
    );
    await t.test(
      "simultaneous closure and scan leave one consistent record",
      async () => {
        const race = await createClass();
        const results = await Promise.all([
          request("/attendance/scan", student.token, { qrToken: race.qrToken }),
          request(`/lecturer/sessions/${race.id}/close`, lecturer.token, {}),
        ]);
        assert.ok([201, 400].includes(results[0].status));
        assert.equal(results[1].status, 200);
        const records = await db
          .collection("attendance_records")
          .find({
            session_id: new ObjectId(race.id),
            student_id: student.profile._id,
          })
          .toArray();
        assert.equal(records.length, 1);
        assert.equal(
          records[0].attendance_status,
          results[0].status === 201 ? "PRESENT" : "ABSENT",
        );
      },
    );
    await t.test("logout revokes the current token", async () => {
      assert.equal(
        (await request("/auth/logout", student.token, {})).status,
        200,
      );
      assert.equal((await request("/auth/profile", student.token)).status, 401);
    });
  } finally {
    if (course) {
      const classes = await db
        .collection("attendance_sessions")
        .find({ module_id: course._id })
        .toArray();
      await db
        .collection("attendance_records")
        .deleteMany({ session_id: { $in: classes.map((item) => item._id) } });
      await db
        .collection("attendance_sessions")
        .deleteMany({ module_id: course._id });
      await db.collection("enrollments").deleteMany({ module_id: course._id });
      await db.collection("modules").deleteOne({ _id: course._id });
    }
    const ids = users.map((user) => user._id);
    await db.collection("students").deleteMany({ user_id: { $in: ids } });
    await db.collection("lecturers").deleteMany({ user_id: { $in: ids } });
    await db.collection("users").deleteMany({ _id: { $in: ids } });
    if (department)
      await db.collection("departments").deleteOne({ _id: department._id });
    await new Promise((resolve) => server.close(resolve));
    await client.close();
  }
});
