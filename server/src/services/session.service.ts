import prisma from '../config/database';
import { Prisma, SessionStatus } from '@prisma/client';
import { emitToSession } from './socket.service';

// Every scan and finalization writes the session document inside its transaction.
// MongoDB write conflicts prevent a concurrent scan from slipping past closure.
export async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work); }
    catch (error: any) {
      if (error.code !== 'P2034' || attempt >= 6) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.min(250, 10 * 2 ** attempt) + Math.random() * 20));
    }
  }
}
export async function finalizeSession(id: string, status: SessionStatus = 'CLOSED') {
  const result = await transaction(async tx => {
    const session = await tx.attendanceSession.findUniqueOrThrow({ where: { id } });
    if (session.status !== 'ACTIVE') return session;
    const updated = await tx.attendanceSession.update({ where: { id }, data: { status, currentQrToken: '', tokenExpiry: new Date() } });
    const enrollments = await tx.enrollment.findMany({ where: { moduleId: session.moduleId, enrolledAt: { lte: session.startTime } } });
    const records = await tx.attendanceRecord.findMany({ where: { sessionId: id }, select: { studentId: true } });
    const marked = new Set(records.map(r => r.studentId));
    const missing = enrollments.filter(e => !marked.has(e.studentId));
    if (missing.length) await tx.attendanceRecord.createMany({ data: missing.map(e => ({
      sessionId: id, studentId: e.studentId, attendanceStatus: 'ABSENT', verificationMethod: 'SYSTEM_AUTO_ABSENT',
    })) });
    return updated;
  });
  emitToSession(id, 'session_closed', { sessionId: id, status: result.status });
  return result;
}
let sweeping = false;
export async function expireSessions() {
  if (sweeping) return;
  sweeping = true;
  try {
    const expired = await prisma.attendanceSession.findMany({ where: { status: 'ACTIVE', endTime: { lte: new Date() } }, take: 100 });
    for (const session of expired) await finalizeSession(session.id, 'EXPIRED');
  } finally { sweeping = false; }
}
