import axios from "axios";
import { API_BASE_URL, APP_CONFIG } from "../constants/config";
import { useAuthStore } from "../store/authStore";
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: APP_CONFIG.REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const session = useAuthStore.getState();
    const requestToken = error.config?.headers?.Authorization;
    if (
      error.response?.status === 401 &&
      session.accessToken &&
      requestToken === `Bearer ${session.accessToken}`
    ) {
      void session.logout();
    }
    return Promise.reject(error);
  },
);
