import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
export const Storage = {
  async setItem(key, value) {
    if (Platform.OS === "web") sessionStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  async getItem(key) {
    if (Platform.OS === "web") return sessionStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async removeItem(key) {
    if (Platform.OS === "web") sessionStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },
};
