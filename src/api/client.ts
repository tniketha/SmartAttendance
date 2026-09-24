import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, APP_CONFIG } from '../constants/config';
import { useAuthStore } from '../store/authStore';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: APP_CONFIG.REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const state = useAuthStore.getState();
    const request = config as InternalAxiosRequestConfig & { _authEpoch?: number };
    if (request._authEpoch !== undefined && request._authEpoch !== state.authEpoch) throw new Error('Sign-in changed; request cancelled');
    request._authEpoch = state.authEpoch;
    const token = state.accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 & Token Refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _authEpoch?: number };
    if (originalRequest?._authEpoch !== undefined && originalRequest._authEpoch !== useAuthStore.getState().authEpoch) return Promise.reject(error);

    if (originalRequest && !originalRequest.url?.startsWith('/auth/') && error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        isRefreshing = false;
        processQueue(error);
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        }, { timeout: APP_CONFIG.REQUEST_TIMEOUT_MS });

        const newAccessToken = response.data.data.accessToken;
        if (useAuthStore.getState().refreshToken !== refreshToken) throw new Error('Sign-in changed during refresh');
        await useAuthStore.getState().updateAccessToken(newAccessToken, response.data.data.refreshToken);

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        if (originalRequest._authEpoch === useAuthStore.getState().authEpoch) void useAuthStore.getState().logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
