import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/role.middleware';
import { Role } from '@prisma/client';

import { validateIds } from '../middleware/validation.middleware';
const router = Router();
router.param('id', (req, res, next) => validateIds(req, res, next));
router.param('moduleId', (req, res, next) => validateIds(req, res, next));

// Protect all student routes
router.use(authenticateJWT);
router.use(requireRoles([Role.STUDENT, Role.ADMIN]));

router.get('/dashboard', StudentController.getDashboard);
router.get('/modules', StudentController.getModules);
router.get('/attendance/history', StudentController.getAttendanceHistory);
router.get('/attendance/statistics', StudentController.getStatistics);

export default router;
