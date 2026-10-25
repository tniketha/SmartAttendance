const { Router } = require("express");
const {
  AttendanceController,
} = require("../controllers/attendance.controller");
const { authenticateJWT } = require("../middleware/auth.middleware");
const { asyncHandler } = require("../middleware/error.middleware");
const { requireRoles } = require("../middleware/role.middleware");
const { validate, scanSchema } = require("../middleware/validation.middleware");
const router = Router();
router.use(authenticateJWT, requireRoles(["STUDENT"]));
router.post(
  "/scan",
  validate(scanSchema),
  asyncHandler(AttendanceController.scanAttendance),
);
module.exports = router;
