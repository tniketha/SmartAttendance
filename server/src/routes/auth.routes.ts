import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', authenticateJWT, AuthController.logout);
router.post('/change-password', authenticateJWT, AuthController.changePassword);
router.get('/profile', authenticateJWT, AuthController.getProfile);

export default router;
