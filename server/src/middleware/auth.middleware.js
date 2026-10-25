const { createHash } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { db, ObjectId } = require("../config/database");
const { ENV } = require("../config/env");
const { sendError } = require("../utils/response.utils");
function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
async function authenticateJWT(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer "))
    return sendError(res, "Please sign in.", 401);
  try {
    const token = authorization.slice(7);
    const payload = jwt.verify(token, ENV.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.userId !== "string" ||
      !/^[a-f0-9]{24}$/i.test(payload.userId)
    )
      throw new Error("Invalid user");
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(payload.userId) });
    if (!user || !user.is_active || user.tokenHash !== hashToken(token))
      return sendError(res, "Please sign in again.", 401);
    const student = await db
      .collection("students")
      .findOne({ user_id: user._id });
    const lecturer = await db
      .collection("lecturers")
      .findOne({ user_id: user._id });
    req.user = {
      userId: user._id,
      role: user.role,
      studentId: student?._id,
      lecturerId: lecturer?._id,
    };
    next();
  } catch {
    sendError(res, "Your sign-in has expired. Please sign in again.", 401);
  }
}
module.exports = { authenticateJWT, hashToken };
