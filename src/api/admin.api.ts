import { apiClient } from './client';
import { ApiResponse } from '../types/api.types';

export const adminApi = {
  getSystemStats: async (): Promise<any> => {
    const res = await apiClient.get<ApiResponse<any>>('/admin/system-stats');
    return res.data.data;
  },

  getUsers: async (): Promise<any[]> => {
    const res = await apiClient.get<ApiResponse<any[]>>('/admin/users');
    return res.data.data;
  },

  toggleUserStatus: async (userId: string): Promise<any> => {
    const res = await apiClient.patch<ApiResponse<any>>(`/admin/users/${userId}/toggle-status`);
    return res.data.data;
  },

  getAuditLogs: async (): Promise<any[]> => {
    const res = await apiClient.get<ApiResponse<any[]>>('/admin/audit-logs');
    return res.data.data;
  },
};
