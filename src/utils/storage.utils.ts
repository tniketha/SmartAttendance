import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isAvailable = Platform.OS !== 'web';

export const Storage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (isAvailable) {
        await SecureStore.setItemAsync(key, value);
      } else {
        sessionStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('Storage setItem error:', e);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (isAvailable) {
        return await SecureStore.getItemAsync(key);
      } else {
        if (['access_token', 'refresh_token', 'user_data'].includes(key)) localStorage.removeItem(key);
        return sessionStorage.getItem(key);
      }
    } catch (e) {
      console.warn('Storage getItem error:', e);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (isAvailable) {
        await SecureStore.deleteItemAsync(key);
      } else {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('Storage removeItem error:', e);
    }
  },
};
