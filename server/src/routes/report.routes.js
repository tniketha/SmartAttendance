const { Router } = require("express");
const { ReportController } = require("../controllers/report.controller");
const { authenticateJWT } = require("../middleware/auth.middleware");
const { asyncHandler } = require("../middleware/error.middleware");
const { requireRoles } = require("../middleware/role.middleware");
const { validateIds } = require("../middleware/validation.middleware");
const router = Router();
router.use(authenticateJWT, requireRoles(["LECTURER"]));
router.get(
  "/module/:moduleId",
  validateIds,
  asyncHandler(ReportController.getModuleReport),
);
router.get(
  "/module/:moduleId/export-csv",
  validateIds,
  asyncHandler(ReportController.exportModuleCSV),
);
module.exports = router;
