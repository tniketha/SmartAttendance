import { apiClient } from './client';
import { ApiResponse } from '../types/api.types';
import {
  LecturerDashboardData,
  LiveSessionData,
  QRPayload,
} from '../types/attendance.types';

export interface CreateSessionPayload {
  moduleId: string;
  durationMinutes?: number;
  lateThresholdMinutes?: number;
  geoValidationEnabled?: boolean;
  latitude?: number;
  longitude?: number;
  allowedRadius?: number;
}

export interface CreateSessionResponse {
  session: {
    id: string;
    sessionCode: string;
    moduleCode: string;
    moduleName: string;
    startTime: string;
    endTime: string;
    status: string;
    totalEnrolled: number;
  };
  qrPayload: QRPayload;
  qrString: string;
  expiresAt: string;
}

export interface RefreshQRResponse {
  qrPayload: QRPayload;
  qrString: string;
  expiresAt: string;
}

export interface CloseSessionResponse {
  sessionCode: string;
  moduleCode: string;
  moduleName: string;
  totalStudents: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number;
}

export const lecturerApi = {
  getDashboard: async (): Promise<LecturerDashboardData> => {
    const res = await apiClient.get<ApiResponse<LecturerDashboardData>>('/lecturer/dashboard');
    return res.data.data;
  },

  getModules: async (): Promise<any[]> => {
    const res = await apiClient.get<ApiResponse<any[]>>('/lecturer/modules');
    return res.data.data;
  },

  getModuleStudents: async (moduleId: string): Promise<any[]> => {
    const res = await apiClient.get<ApiResponse<any[]>>(`/lecturer/modules/${moduleId}/students`);
    return res.data.data;
  },

  createSession: async (payload: CreateSessionPayload): Promise<CreateSessionResponse> => {
    const res = await apiClient.post<ApiResponse<CreateSessionResponse>>('/lecturer/sessions', payload);
    return res.data.data;
  },

  refreshQR: async (sessionId: string): Promise<RefreshQRResponse> => {
    const res = await apiClient.post<ApiResponse<RefreshQRResponse>>(
      `/lecturer/sessions/${sessionId}/refresh-qr`
    );
    return res.data.data;
  },

  getSessionLive: async (sessionId: string): Promise<LiveSessionData> => {
    const res = await apiClient.get<ApiResponse<LiveSessionData>>(
      `/lecturer/sessions/${sessionId}/live`
    );
    return res.data.data;
  },

  closeSession: async (sessionId: string): Promise<CloseSessionResponse> => {
    const res = await apiClient.post<ApiResponse<CloseSessionResponse>>(
      `/lecturer/sessions/${sessionId}/close`
    );
    return res.data.data;
  },

  overrideAttendance: async (recordId: string, newStatus: string, reason: string): Promise<any> => {
    const res = await apiClient.patch<ApiResponse<any>>(`/attendance/${recordId}/override`, {
      newStatus,
      reason,
    });
    return res.data.data;
  },
};
