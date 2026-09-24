import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/role.middleware';
import { Role } from '@prisma/client';

import { validateIds } from '../middleware/validation.middleware';
const router = Router();
router.param('id', (req, res, next) => validateIds(req, res, next));
router.param('moduleId', (req, res, next) => validateIds(req, res, next));

router.use(authenticateJWT);
router.use(requireRoles([Role.ADMIN]));

router.get('/system-stats', AdminController.getSystemStats);
router.get('/users', AdminController.getUsers);
router.patch('/users/:id/toggle-status', AdminController.toggleUserStatus);
router.get('/audit-logs', AdminController.getAuditLogs);

export default router;
