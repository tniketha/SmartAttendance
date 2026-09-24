import axios from 'axios';
import { API_BASE_URL } from '../constants/config';
import { create } from 'zustand';
import { User } from '../types/auth.types';
import { Storage } from '../utils/storage.utils';

interface AuthStoreState {
  authEpoch: number;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateAccessToken: (token: string, refreshToken?: string) => Promise<void>;
  initialize: () => Promise<void>;
}

// Serialize persistence so a refresh finishing after sign-out cannot restore tokens.
let persistence = Promise.resolve();
function persistSession() {
  persistence = persistence.catch(() => {}).then(async () => {
    const state = useAuthStore.getState();
    const values = { access_token: state.accessToken, refresh_token: state.refreshToken, user_data: state.user ? JSON.stringify(state.user) : null };
    await Promise.all(Object.entries(values).map(([key, value]) => value ? Storage.setItem(key, value) : Storage.removeItem(key)));
  });
  return persistence;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  authEpoch: 0,
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    const epoch = get().authEpoch;
    try {
      const [token, refresh, storedUser] = await Promise.all([
        Storage.getItem('access_token'),
        Storage.getItem('refresh_token'),
        Storage.getItem('user_data'),
      ]);

      if (get().authEpoch !== epoch) return;
      if (token && refresh && storedUser) {
        set({
          accessToken: token,
          refreshToken: refresh,
          user: JSON.parse(storedUser),
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (accessToken: string, refreshToken: string, user: User) => {
    set({
      authEpoch: get().authEpoch + 1,
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
      isLoading: false,
    });
    await persistSession();
  },

  logout: async () => {
    const token = get().accessToken;
    set({ authEpoch: get().authEpoch + 1, accessToken: null, refreshToken: null, user: null, isAuthenticated: false, isLoading: false });
    if (token) void axios.post(`${API_BASE_URL}/auth/logout`, {}, { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }).catch(() => {});
    await persistSession();
  },

  updateAccessToken: async (token: string, refreshToken?: string) => {
    if (!get().isAuthenticated) return;
    set({ accessToken: token, ...(refreshToken ? { refreshToken } : {}) });
    await persistSession();
  },
}));
