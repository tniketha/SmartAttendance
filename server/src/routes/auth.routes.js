const { Router } = require("express");
const { AuthController } = require("../controllers/auth.controller");
const { authenticateJWT } = require("../middleware/auth.middleware");
const { asyncHandler } = require("../middleware/error.middleware");
const router = Router();
router.post("/login", asyncHandler(AuthController.login));
router.post("/logout", authenticateJWT, asyncHandler(AuthController.logout));
router.get(
  "/profile",
  authenticateJWT,
  asyncHandler(AuthController.getProfile),
);
module.exports = router;
