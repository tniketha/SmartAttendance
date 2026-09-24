export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type SessionStatus = 'ACTIVE' | 'CLOSED' | 'EXPIRED';

export interface QRPayload {
  sessionId: string;
  nonce: string;
  timestamp: number;
  expiresAt: string;
  signature: string;
}

export interface AttendanceRecord {
  review?: { status: string; decisionReason?: string | null } | null;
  id: string;
  sessionId: string;
  moduleCode: string;
  moduleName: string;
  lecturerName: string;
  sessionDate: string;
  startTime: string;
  scannedAt: string | null;
  status: AttendanceStatus;
  verificationMethod: string;
}

export interface StudentDashboardStats {
  overallPercentage: number;
  totalClasses: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  enrolledModulesCount: number;
}

export interface TodayClassSession {
  id: string;
  sessionCode: string;
  moduleCode: string;
  moduleName: string;
  startTime: string;
  endTime: string;
  status: SessionStatus;
  userAttendanceStatus: AttendanceStatus | null;
  hasMarked: boolean;
}

export interface SubjectAttendanceStat {
  moduleCode: string;
  moduleName: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  percentage: number;
}

export interface LecturerDashboardData {
  totalModules: number;
  todaySessionsCount: number;
  averageAttendanceRate: number;
  modules: Array<{
    id: string;
    moduleCode: string;
    moduleName: string;
    enrolledCount: number;
  }>;
  todaySessions: Array<{
    id: string;
    sessionCode: string;
    moduleCode: string;
    moduleName: string;
    status: SessionStatus;
    startTime: string;
    endTime: string;
    totalScanned: number;
  }>;
}

export interface LiveCheckedInStudent {
  id: string;
  studentId: string;
  studentNumber: string;
  name: string;
  status: AttendanceStatus;
  scannedAt: string;
  verificationMethod: string;
}

export interface LiveSessionData {
  session: {
    id: string;
    sessionCode: string;
    moduleCode: string;
    moduleName: string;
    status: SessionStatus;
    startTime: string;
    endTime: string;
  };
  counts: {
    totalEnrolled: number;
    checkedIn: number;
    present: number;
    late: number;
    absent: number;
    missing: number;
  };
  checkedInStudents: LiveCheckedInStudent[];
  missingStudents: Array<{
    studentId: string;
    studentNumber: string;
    name: string;
  }>;
}
