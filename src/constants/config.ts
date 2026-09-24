import { Platform } from 'react-native';

// For Android emulator: 10.0.2.2, for iOS simulator: localhost, or replace with your local Wi-Fi IP (e.g., 192.168.1.100)
const DEV_MACHINE_IP = 'localhost';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || (
  Platform.OS === 'android'
    ? 'http://10.0.2.2:5000/api'
    : `http://${DEV_MACHINE_IP}:5000/api`);

if (!__DEV__ && !API_BASE_URL.startsWith('https://')) throw new Error('Release builds require an HTTPS EXPO_PUBLIC_API_URL');

export const SOCKET_URL = API_BASE_URL.replace(/\/api$/, '');

export const APP_CONFIG = {
  QR_REFRESH_SECONDS: 20,
  REQUEST_TIMEOUT_MS: 10000,
  APP_NAME: 'Smart Attendance',
};
