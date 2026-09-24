import { apiClient } from './client';
import { ApiResponse } from '../types/api.types';

export const reportsApi = {
  getModuleReport: async (moduleId: string): Promise<any> => {
    const res = await apiClient.get<ApiResponse<any>>(`/reports/module/${moduleId}`);
    return res.data.data;
  },
};
