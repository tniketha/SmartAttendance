const { Router } = require("express");
const { StudentController } = require("../controllers/student.controller");
const { authenticateJWT } = require("../middleware/auth.middleware");
const { asyncHandler } = require("../middleware/error.middleware");
const { requireRoles } = require("../middleware/role.middleware");
const router = Router();
router.use(authenticateJWT, requireRoles(["STUDENT"]));
router.get("/dashboard", asyncHandler(StudentController.getDashboard));
router.get("/modules", asyncHandler(StudentController.getModules));
router.get(
  "/attendance/history",
  asyncHandler(StudentController.getAttendanceHistory),
);
router.get(
  "/attendance/statistics",
  asyncHandler(StudentController.getStatistics),
);
module.exports = router;
