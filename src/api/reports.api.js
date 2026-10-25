import { apiClient } from "./client";
export const reportsApi = {
  getModuleReport: async (moduleId) => {
    const res = await apiClient.get(`/reports/module/${moduleId}`);
    return res.data.data;
  },
};
