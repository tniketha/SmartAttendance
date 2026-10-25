import { apiClient } from "./client";
export const authApi = {
  login: async (identifier, password) => {
    const res = await apiClient.post("/auth/login", {
      identifier,
      password,
    });
    return res.data.data;
  },
  getProfile: async () => {
    const res = await apiClient.get("/auth/profile");
    return res.data.data;
  },
};
