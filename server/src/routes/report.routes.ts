import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/role.middleware';
import { Role } from '@prisma/client';

import { validateIds } from '../middleware/validation.middleware';
const router = Router();
router.param('id', (req, res, next) => validateIds(req, res, next));
router.param('moduleId', (req, res, next) => validateIds(req, res, next));

router.use(authenticateJWT);
router.use(requireRoles([Role.LECTURER, Role.ADMIN]));

router.get('/module/:moduleId', ReportController.getModuleReport);
router.get('/module/:moduleId/export-csv', ReportController.exportModuleCSV);

export default router;
