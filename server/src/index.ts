import { expireSessions } from './services/session.service';
import prisma from './config/database';
import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ENV } from './config/env';
import { initializeSocket } from './services/socket.service';
import { errorHandler } from './middleware/error.middleware';

// Import Routes
import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import lecturerRoutes from './routes/lecturer.routes';
import attendanceRoutes from './routes/attendance.routes';
import reportRoutes from './routes/report.routes';
import adminRoutes from './routes/admin.routes';

const app = express();
const httpServer = http.createServer(app);

// 1. Security & Standard Middleware
app.use(helmet());
app.disable('x-powered-by');
app.use(cors({ origin: ENV.ALLOWED_ORIGINS }));
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// 2. Rate Limiting (General API: 300 requests per 15 mins)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// 3. Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Smart Attendance System API',
  });
});

// 4. Mount API Routes
app.get('/api/ready', async (_req, res) => {
  try {
    const hello = await prisma.$runCommandRaw({ hello: 1 });
    const ready = Boolean(hello.setName || hello.msg === 'isdbgrid');
    res.status(ready ? 200 : 503).json({ success: ready, message: ready ? 'Database ready' : 'MongoDB replica-set configuration is required' });
  } catch { res.status(503).json({ success: false, message: 'Database unavailable' }); }
});
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 40, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Too many sign-in attempts. Try again in 15 minutes.' } }), authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/lecturer', lecturerRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// 5. Global Error Handling Middleware
app.use(errorHandler);

// 6. Initialize Real-Time WebSocket Server
initializeSocket(httpServer);

const sweep = () => expireSessions().catch(() => console.error('Session expiry failed; check database connectivity and replica-set configuration'));
void sweep();
const expiryTimer = setInterval(sweep, 15000);
expiryTimer.unref();
httpServer.on('close', () => clearInterval(expiryTimer));

// 7. Start HTTP & Socket.IO Server
httpServer.listen(ENV.PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Smart Attendance Server is running on port ${ENV.PORT}`);
  console.log(`📍 Environment: ${ENV.NODE_ENV}`);
  console.log(`⚡ WebSocket Server active & listening`);
  console.log(`====================================================`);
});

export { app, httpServer };
