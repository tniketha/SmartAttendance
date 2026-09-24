import { Router } from 'express';
import { LecturerController } from '../controllers/lecturer.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/role.middleware';
import { Role } from '@prisma/client';

import { validateIds } from '../middleware/validation.middleware';
import { validate, sessionSchema } from '../middleware/validation.middleware';
const router = Router();
router.param('id', (req, res, next) => validateIds(req, res, next));
router.param('moduleId', (req, res, next) => validateIds(req, res, next));

router.use(authenticateJWT);
router.use(requireRoles([Role.LECTURER, Role.ADMIN]));

router.get('/dashboard', LecturerController.getDashboard);
router.get('/modules', LecturerController.getModules);
router.get('/modules/:moduleId/students', LecturerController.getModuleStudents);
router.post('/sessions', validate(sessionSchema), LecturerController.createSession);
router.post('/sessions/:id/refresh-qr', LecturerController.refreshQR);
router.get('/sessions/:id/live', LecturerController.getSessionLive);
router.post('/sessions/:id/close', LecturerController.closeSession);

export default router;
