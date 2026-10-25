import { Platform } from "react-native";
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:5000/api"
    : "http://localhost:5000/api");
export const APP_CONFIG = {
  REQUEST_TIMEOUT_MS: 10000,
};
