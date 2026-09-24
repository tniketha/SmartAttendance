import { finalizeSession, transaction } from '../services/session.service';
import { Response } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendError, sendSuccess } from '../utils/response.utils';
import { QRService } from '../services/qr.service';
import { calculateDistanceMeters } from '../utils/geo.utils';
import { emitToSession } from '../services/socket.service';
import { AttendanceStatus, SessionStatus } from '@prisma/client';

export class AttendanceController {
  /**
   * Process Student Scanned QR Token
   */
  public static async scanAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.studentId;
      if (!studentId) {
        sendError(res, 'Student profile not linked to account', 403);
        return;
      }

      const { qrToken, latitude, longitude, accuracy, locationTimestamp, mocked } = req.body;

      if (!qrToken) {
        sendError(res, 'QR code payload is required', 400);
        return;
      }

      // 1. Validate QR Token (Signature, Expiration, Format)
      const qrValidation = QRService.validateQRToken(qrToken);
      if (!qrValidation.isValid || !qrValidation.sessionId) {
        sendError(res, qrValidation.error || 'Invalid or expired QR code', 400);
        return;
      }

      const sessionId = qrValidation.sessionId;

      // 2. Fetch Session & Module
      const session = await prisma.attendanceSession.findUnique({
        where: { id: sessionId },
        include: { module: true },
      });

      if (!session) {
        sendError(res, 'Attendance session does not exist', 404);
        return;
      }

      // Check session status
      if (session.status !== SessionStatus.ACTIVE) {
        sendError(res, `This attendance session is ${session.status.toLowerCase()}`, 400);
        return;
      }

      const now = new Date();

      // Check session overall expiration
      if (now >= session.endTime) {
        // Automatically mark as expired
        await finalizeSession(sessionId, 'EXPIRED');
        sendError(res, 'This attendance session has expired', 400);
        return;
      }

      // 3. Verify Student Enrollment
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_moduleId: {
            studentId,
            moduleId: session.moduleId,
          },
        },
      });

      if (!enrollment || enrollment.enrolledAt > session.startTime) {
        sendError(res, 'You are not enrolled in this module', 403);
        return;
      }

      // 4. Duplicate Check
      const existingRecord = await prisma.attendanceRecord.findUnique({
        where: {
          sessionId_studentId: {
            sessionId,
            studentId,
          },
        },
      });

      if (existingRecord) {
        sendError(res, 'Attendance already recorded for this session', 409);
        return;
      }

      // 5. Geolocation Validation (if enabled)
      let verificationMethod = 'QR_SCAN';
      if (session.geoValidationEnabled) {
        if (session.latitude === null || session.longitude === null) {
          sendError(res, 'Classroom location is not configured', 400); return;
        }
        if (mocked || typeof accuracy !== 'number' || accuracy > Math.min(session.allowedRadius ?? 100, 100) ||
            typeof locationTimestamp !== 'number' || now.getTime() - locationTimestamp > 30000 || locationTimestamp > now.getTime() + 5000) {
          sendError(res, 'A fresh, accurate location is required. Enable precise location and try again.', 400); return;
        }
        if (latitude === undefined || longitude === undefined) {
          sendError(res, 'Location coordinates required for this session', 400);
          return;
        }

        const distance = calculateDistanceMeters(
          latitude,
          longitude,
          session.latitude,
          session.longitude
        );

        const allowedRadius = session.allowedRadius || 100;
        if (distance > allowedRadius) {
          sendError(
            res,
            `You are outside the allowed attendance area. Distance: ${Math.round(distance)}m (Allowed: ${allowedRadius}m)`,
            400
          );
          return;
        }
        verificationMethod = 'QR_SCAN_GEO';
      }

      // 6. Determine Attendance Status (PRESENT vs LATE)
      let attendanceStatus: AttendanceStatus = AttendanceStatus.PRESENT;
      if (session.lateThresholdTime && now > session.lateThresholdTime) {
        attendanceStatus = AttendanceStatus.LATE;
      }

      // 7. Save Attendance Record
      const record = await transaction(async tx => {
        const locked = await tx.attendanceSession.updateMany({
          where: { id: sessionId, status: 'ACTIVE', endTime: { gt: new Date() }, currentQrToken: qrToken, tokenExpiry: { gt: new Date() } },
          data: { updatedAt: new Date() },
        });
        if (locked.count !== 1) throw Object.assign(new Error('Session closed or QR changed. Scan the current code.'), { code: 'SCAN_EXPIRED' });
        return tx.attendanceRecord.create({
        data: {
          sessionId,
          studentId,
          attendanceStatus,
          scannedAt: now,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          verificationMethod,
        },
        include: {
          student: {
            include: { user: true },
          },
        },
      });

      });

      // 8. Real-time broadcast to lecturer session room
      emitToSession(sessionId, 'student_scanned', {
        id: record.id,
        studentId: record.studentId,
        studentNumber: record.student.studentNumber,
        name: record.student.user.name,
        status: record.attendanceStatus,
        scannedAt: record.scannedAt,
      });

      // 9. Send success response
      sendSuccess(
        res,
        {
          recordId: record.id,
          moduleCode: session.module.moduleCode,
          moduleName: session.module.moduleName,
          status: record.attendanceStatus,
          scannedAt: record.scannedAt,
        },
        '✓ Attendance Successfully Recorded',
        201
      );
    } catch (err: any) {
      // Catch Prisma compound unique constraint violation error code P2002
      if (err.code === 'SCAN_EXPIRED') { sendError(res, err.message, 400); return; }
      if (err.code === 'P2002') {
        sendError(res, 'Attendance already recorded for this session', 409);
        return;
      }
      console.error('Scan failed:', err.code || err.name);
      sendError(res, 'Failed to record attendance', 500);
    }
  }

  /**
   * Manual Status Override with Audit Logging (Lecturers & Admins)
   */
  public static async overrideAttendance(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { newStatus, reason } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        sendError(res, 'Unauthorized', 401);
        return;
      }

      if (!newStatus || !Object.values(AttendanceStatus).includes(newStatus)) {
        sendError(res, 'Valid attendance status is required', 400);
        return;
      }

      if (typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 1000) {
        sendError(res, 'A clear reason is required for attendance modification', 400);
        return;
      }

      const existingRecord = await prisma.attendanceRecord.findUnique({
        where: { id },
        include: { session: true },
      });

      if (!existingRecord) {
        sendError(res, 'Attendance record not found', 404);
        return;
      }

      // If lecturer, ensure they teach this module
      if (req.user?.role === 'LECTURER') {
        if (existingRecord.session.lecturerId !== req.user.lecturerId) {
          sendError(res, 'Forbidden: You do not manage this session', 403);
          return;
        }
      }

      // Commit the correction and its audit trail together.
      const updated = await transaction(async tx => {
      const current = await tx.attendanceRecord.findUniqueOrThrow({ where: { id } });
      const rec = await tx.attendanceRecord.update({
        where: { id },
        data: {
          attendanceStatus: newStatus,
          verificationMethod: 'MANUAL_OVERRIDE',
        },
      });

      await tx.attendanceAuditLog.create({
        data: {
          attendanceRecordId: id,
          changedById: userId,
          oldStatus: current.attendanceStatus,
          newStatus,
          reason: reason.trim(),
        },
      });

      return rec;
      });

      sendSuccess(res, updated, 'Attendance status successfully updated');
    } catch (err: any) {
      console.error('Override error:', err);
      sendError(res, 'Failed to override attendance status', 500);
    }
  }
}
