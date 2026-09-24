import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { objectId } from '../middleware/validation.middleware';
import { sendError, sendSuccess } from '../utils/response.utils';
import { transaction } from '../services/session.service';

export class ReviewController {
  static async submit(req: AuthenticatedRequest, res: Response): Promise<void> {
    const parsed = z.object({ recordId: objectId, requestedStatus: z.enum(['PRESENT', 'LATE', 'EXCUSED']), reason: z.string().trim().min(10).max(1000) }).safeParse(req.body);
    if (!parsed.success) { sendError(res, 'Choose a status and explain your request in 10–1000 characters', 400); return; }
    try {
      const { recordId, ...data } = parsed.data;
      const record = await prisma.attendanceRecord.findUnique({ where: { id: recordId }, include: { session: true } });
      if (!record || record.studentId !== req.user?.studentId) { sendError(res, 'Attendance record not found', 404); return; }
      if (record.session.status === 'ACTIVE' || record.attendanceStatus === data.requestedStatus) { sendError(res, 'Request a different status after the session ends', 400); return; }
      const review = await prisma.attendanceReviewRequest.create({ data: { attendanceRecordId: recordId, ...data } });
      sendSuccess(res, review, 'Request sent to your lecturer', 201);
    } catch (e: any) { sendError(res, e.code === 'P2002' ? 'A review has already been requested for this class' : 'Unable to submit request', e.code === 'P2002' ? 409 : 500); }
  }
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const where = req.user?.role === 'STUDENT' ? { attendanceRecord: { studentId: req.user.studentId! } } : req.user?.role === 'ADMIN' ? {} : { attendanceRecord: { session: { lecturerId: req.user!.lecturerId! } } };
      if ((req.user?.role === 'STUDENT' && !req.user.studentId) || (req.user?.role === 'LECTURER' && !req.user.lecturerId)) { sendError(res, 'Account profile missing', 403); return; }
      const requests = await prisma.attendanceReviewRequest.findMany({ where: { ...where, ...(req.user?.role === 'STUDENT' ? {} : { status: 'PENDING' }) }, orderBy: { createdAt: 'desc' }, take: 100, include: { attendanceRecord: { select: { attendanceStatus: true, student: { select: { studentNumber: true, user: { select: { name: true } } } }, session: { select: { sessionDate: true, module: { select: { moduleCode: true } } } } } } } });
      sendSuccess(res, requests);
    } catch { sendError(res, 'Unable to load requests', 500); }
  }
  static async resolve(req: AuthenticatedRequest, res: Response): Promise<void> {
    const parsed = z.object({ decision: z.enum(['APPROVED', 'REJECTED']), reason: z.string().trim().min(3).max(1000) }).safeParse(req.body);
    if (!parsed.success) { sendError(res, 'A decision and explanation are required', 400); return; }
    try {
      const result = await transaction(async tx => {
        const review = await tx.attendanceReviewRequest.findUnique({ where: { id: req.params.id }, include: { attendanceRecord: { include: { session: true } } } });
        if (!review || (req.user?.role !== 'ADMIN' && review.attendanceRecord.session.lecturerId !== req.user?.lecturerId)) throw Object.assign(new Error('Request not found'), { status: 404 });
        if (review.status !== 'PENDING') throw Object.assign(new Error('This request has already been resolved'), { status: 409 });
        const updated = await tx.attendanceReviewRequest.update({ where: { id: review.id }, data: { status: parsed.data.decision, decisionReason: parsed.data.reason, resolvedById: req.user!.userId, resolvedAt: new Date() } });
        if (parsed.data.decision === 'APPROVED') {
          await tx.attendanceRecord.update({ where: { id: review.attendanceRecordId }, data: { attendanceStatus: review.requestedStatus, verificationMethod: 'REVIEW_APPROVED' } });
          await tx.attendanceAuditLog.create({ data: { attendanceRecordId: review.attendanceRecordId, changedById: req.user!.userId, oldStatus: review.attendanceRecord.attendanceStatus, newStatus: review.requestedStatus, reason: parsed.data.reason } });
        }
        return updated;
      });
      sendSuccess(res, result, 'Review decision saved');
    } catch (e: any) { sendError(res, e.status ? e.message : 'Unable to resolve review', e.status || 500); }
  }
}
