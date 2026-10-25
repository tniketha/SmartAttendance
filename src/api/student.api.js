import { apiClient } from "./client";
export const studentApi = {
  getDashboard: async () => {
    const res = await apiClient.get("/student/dashboard");
    return res.data.data;
  },
  getModules: async () => {
    const res = await apiClient.get("/student/modules");
    return res.data.data;
  },
  getAttendanceHistory: async (params) => {
    const res = await apiClient.get("/student/attendance/history", {
      params,
    });
    return res.data.data;
  },
  getStatistics: async () => {
    const res = await apiClient.get("/student/attendance/statistics");
    return res.data.data;
  },
  scanAttendance: async (payload) => {
    const res = await apiClient.post("/attendance/scan", payload);
    return res.data.data;
  },
};
