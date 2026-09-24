import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { ENV } from '../config/env';
import { AuthUserPayload } from '../middleware/auth.middleware';
let io: SocketIOServer | null = null;
export const initializeSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, { cors: { origin: ENV.ALLOWED_ORIGINS }, maxHttpBufferSize: 4096 });
  io.use(async (socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth.token, ENV.JWT_SECRET, { algorithms: ['HS256'] }) as AuthUserPayload & { exp: number };
      const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { lecturer: true } });
      if (!user?.isActive || user.role === 'STUDENT' || (user.sessionVersion ?? 0) !== payload.sessionVersion) throw new Error();
      socket.data.user = user;
      const timer = setTimeout(() => socket.disconnect(true), Math.max(0, payload.exp * 1000 - Date.now()));
      socket.on('disconnect', () => clearTimeout(timer));
      next();
    } catch { next(new Error('Authentication required')); }
  });
  io.on('connection', socket => {
    socket.on('join_session', async (id: unknown) => {
      try {
        if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) return;
        const user = await prisma.user.findUnique({ where: { id: socket.data.user.id }, include: { lecturer: true } });
        const session = await prisma.attendanceSession.findUnique({ where: { id } });
        if (!user?.isActive || user.sessionVersion !== socket.data.user.sessionVersion || !session || (user.role !== 'ADMIN' && session.lecturerId !== user.lecturer?.id)) return;
        for (const room of socket.rooms) if (room.startsWith('session_')) await socket.leave(room);
        await socket.join(`session_${id}`);
      } catch { socket.emit('session_error', { error: 'Unable to join session' }); }
    });
    socket.on('leave_session', (id: unknown) => { if (typeof id === 'string') void socket.leave(`session_${id}`); });
  });
  return io;
};
export const getIO = () => { if (!io) throw new Error('Socket not initialized'); return io; };
export const disconnectUser = (userId: string) => {
  if (io) for (const socket of io.sockets.sockets.values()) if (socket.data.user?.id === userId) socket.disconnect(true);
};
export const emitToSession = (id: string, event: string, data: unknown) => { io?.to(`session_${id}`).emit(event, data); };
