import { apiClient } from "./client";
export const lecturerApi = {
  async getDashboard() {
    const response = await apiClient.get("/lecturer/dashboard");
    return response.data.data;
  },
  async getModules() {
    const response = await apiClient.get("/lecturer/modules");
    return response.data.data;
  },
  async createSession(payload) {
    const response = await apiClient.post("/lecturer/sessions", payload);
    return response.data.data;
  },
  async getSession(sessionId) {
    const response = await apiClient.get(`/lecturer/sessions/${sessionId}`);
    return response.data.data;
  },
  async closeSession(sessionId) {
    await apiClient.post(`/lecturer/sessions/${sessionId}/close`);
  },
};
