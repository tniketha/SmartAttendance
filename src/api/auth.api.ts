import { apiClient } from './client';
import { ApiResponse } from '../types/api.types';
import { User } from '../types/auth.types';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authApi = {
  login: async (identifier: string, password: string): Promise<LoginResponse> => {
    const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', {
      identifier,
      password,
    });
    return res.data.data;
  },

  getProfile: async (): Promise<User> => {
    const res = await apiClient.get<ApiResponse<User>>('/auth/profile');
    return res.data.data;
  },
};
