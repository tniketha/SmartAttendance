import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/role.middleware';
import { Role } from '@prisma/client';
import { ReviewController } from '../controllers/review.controller';
import rateLimit from 'express-rate-limit';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

import { validateIds } from '../middleware/validation.middleware';
import { validate, scanSchema } from '../middleware/validation.middleware';
const router = Router();
router.param('id', (req, res, next) => validateIds(req, res, next));
router.param('moduleId', (req, res, next) => validateIds(req, res, next));

router.use(authenticateJWT);
router.use(rateLimit({ windowMs: 60000, max: 30, keyGenerator: req => (req as AuthenticatedRequest).user!.userId, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many attendance requests. Wait a minute and retry.' } }));
router.get('/reviews', ReviewController.list);
router.post('/reviews', requireRoles([Role.STUDENT]), ReviewController.submit);
router.patch('/reviews/:id', requireRoles([Role.LECTURER, Role.ADMIN]), ReviewController.resolve);

// Student scan endpoint
router.post('/scan', requireRoles([Role.STUDENT]), validate(scanSchema), AttendanceController.scanAttendance);

// Lecturer/Admin manual override endpoint
router.patch('/:id/override', requireRoles([Role.LECTURER, Role.ADMIN]), AttendanceController.overrideAttendance);

export default router;
