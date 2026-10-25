import axios from "axios";
import { create } from "zustand";
import { API_BASE_URL } from "../constants/config";
import { Storage } from "../utils/storage.utils";
export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  initialize: async () => {
    try {
      const saved = await Storage.getItem("session");
      if (saved) {
        const session = JSON.parse(saved);
        if (typeof session.accessToken === "string" && session.user?.id) {
          set({
            ...session,
            isAuthenticated: true,
          });
        }
      }
    } catch {
      await Storage.removeItem("session");
    }
    set({
      isLoading: false,
    });
  },
  login: async (accessToken, user) => {
    await Storage.setItem(
      "session",
      JSON.stringify({
        accessToken,
        user,
      }),
    );
    set({
      accessToken,
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },
  logout: async () => {
    const token = get().accessToken;
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    });
    await Storage.removeItem("session");
    if (token) {
      try {
        await axios.post(
          `${API_BASE_URL}/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 5000,
          },
        );
      } catch {
        // Local sign-out still works when the server is unreachable.
      }
    }
  },
}));
