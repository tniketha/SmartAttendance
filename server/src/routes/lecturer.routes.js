const { Router } = require("express");
const { LecturerController } = require("../controllers/lecturer.controller");
const { authenticateJWT } = require("../middleware/auth.middleware");
const { asyncHandler } = require("../middleware/error.middleware");
const { requireRoles } = require("../middleware/role.middleware");
const {
  validate,
  validateIds,
  sessionSchema,
} = require("../middleware/validation.middleware");
const router = Router();
router.use(authenticateJWT, requireRoles(["LECTURER"]));
router.get("/dashboard", asyncHandler(LecturerController.getDashboard));
router.get("/modules", asyncHandler(LecturerController.getModules));
router.post(
  "/sessions",
  validate(sessionSchema),
  asyncHandler(LecturerController.createSession),
);
router.get(
  "/sessions/:id",
  validateIds,
  asyncHandler(LecturerController.getSession),
);
router.post(
  "/sessions/:id/close",
  validateIds,
  asyncHandler(LecturerController.closeSession),
);
module.exports = router;
