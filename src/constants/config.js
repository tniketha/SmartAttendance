import { Platform } from "react-native";
const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
// Docker serves /api on the same origin, including when opened over HTTPS.
export const API_BASE_URL =
  Platform.OS === "web" && typeof window !== "undefined" &&
  configuredUrl === "/api"
    ? `${window.location.origin}/api`
    : configuredUrl ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:5000/api"
    : "http://localhost:5000/api");
export const APP_CONFIG = {
  REQUEST_TIMEOUT_MS: 10000,
};
