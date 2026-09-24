import { apiClient } from './client';
import { ApiResponse } from '../types/api.types';
import {
  AttendanceRecord,
  StudentDashboardStats,
  TodayClassSession,
  SubjectAttendanceStat,
} from '../types/attendance.types';

export interface StudentDashboardResponse {
  stats: StudentDashboardStats;
  todaySessions: TodayClassSession[];
}

export interface ScanAttendancePayload {
  accuracy?: number;
  locationTimestamp?: number;
  mocked?: boolean;
  qrToken: string;
  latitude?: number;
  longitude?: number;
}

export interface ScanAttendanceResponse {
  recordId: string;
  moduleCode: string;
  moduleName: string;
  status: string;
  scannedAt: string;
}

export const studentApi = {
  getDashboard: async (): Promise<StudentDashboardResponse> => {
    const res = await apiClient.get<ApiResponse<StudentDashboardResponse>>('/student/dashboard');
    return res.data.data;
  },

  getModules: async (): Promise<any[]> => {
    const res = await apiClient.get<ApiResponse<any[]>>('/student/modules');
    return res.data.data;
  },

  getAttendanceHistory: async (params?: {
    status?: string;
    moduleId?: string;
  }): Promise<AttendanceRecord[]> => {
    const res = await apiClient.get<ApiResponse<AttendanceRecord[]>>('/student/attendance/history', {
      params,
    });
    return res.data.data;
  },

  getStatistics: async (): Promise<{
    overallPercentage: number;
    totalClasses: number;
    totalPresent: number;
    totalLate: number;
    totalAbsent: number;
    subjectWise: SubjectAttendanceStat[];
  }> => {
    const res = await apiClient.get<ApiResponse<any>>('/student/attendance/statistics');
    return res.data.data;
  },

  scanAttendance: async (payload: ScanAttendancePayload): Promise<ScanAttendanceResponse> => {
    const res = await apiClient.post<ApiResponse<ScanAttendanceResponse>>('/attendance/scan', payload);
    return res.data.data;
  },
};
