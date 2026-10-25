const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("node:crypto");
const { db } = require("../config/database");
const { ENV } = require("../config/env");
const { hashToken } = require("../middleware/auth.middleware");
const { sendError, sendSuccess } = require("../utils/response.utils");
const dummyPassword = bcrypt.hashSync(randomUUID(), 10);

async function profileResponse(user) {
  const student = await db
    .collection("students")
    .findOne({ user_id: user._id });
  const lecturer = await db
    .collection("lecturers")
    .findOne({ user_id: user._id });
  const profile = student || lecturer;
  const department =
    profile &&
    (await db
      .collection("departments")
      .findOne({ _id: profile.department_id }));
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    student: student
      ? {
          id: String(student._id),
          studentNumber: student.student_number,
          programme: student.programme,
          academicYear: student.academic_year,
          batch: student.batch,
          department: department?.name || "",
        }
      : null,
    lecturer: lecturer
      ? {
          id: String(lecturer._id),
          employeeNumber: lecturer.employee_number,
          title: lecturer.title,
          department: department?.name || "",
        }
      : null,
  };
}
const AuthController = {
  async login(req, res) {
    const { identifier, password } = req.body;
    if (
      typeof identifier !== "string" ||
      !identifier.trim() ||
      identifier.length > 254 ||
      typeof password !== "string" ||
      !password ||
      Buffer.byteLength(password) > 72
    )
      return sendError(res, "Enter your email or ID and password.", 400);
    const student = await db
      .collection("students")
      .findOne({ student_number: identifier.trim().toUpperCase() });
    const lecturer = await db
      .collection("lecturers")
      .findOne({ employee_number: identifier.trim().toUpperCase() });
    const user = await db
      .collection("users")
      .findOne({
        $or: [
          { email: identifier.trim().toLowerCase() },
          {
            _id: { $in: [student?.user_id, lecturer?.user_id].filter(Boolean) },
          },
        ],
      });
    const validPassword = await bcrypt.compare(
      password,
      user?.password_hash || dummyPassword,
    );
    if (
      !user ||
      !user.is_active ||
      !["STUDENT", "LECTURER"].includes(user.role) ||
      !validPassword
    )
      return sendError(res, "Invalid credentials.", 401);
    const accessToken = jwt.sign({ userId: String(user._id) }, ENV.JWT_SECRET, {
      expiresIn: "8h",
      jwtid: randomUUID(),
    });
    await db
      .collection("users")
      .updateOne(
        { _id: user._id },
        { $set: { tokenHash: hashToken(accessToken), updated_at: new Date() } },
      );
    sendSuccess(res, { accessToken, user: await profileResponse(user) });
  },
  async logout(req, res) {
    const token = req.headers.authorization.slice(7);
    await db
      .collection("users")
      .updateOne(
        { _id: req.user.userId, tokenHash: hashToken(token) },
        { $set: { tokenHash: null } },
      );
    sendSuccess(res, null, "Signed out.");
  },
  async getProfile(req, res) {
    const user = await db.collection("users").findOne({ _id: req.user.userId });
    sendSuccess(res, await profileResponse(user));
  },
};
module.exports = { AuthController };
