import { Platform } from 'react-native';

// For Android emulator: 10.0.2.2, for iOS simulator: localhost, or replace with your local Wi-Fi IP (e.g., 192.168.1.100)
const DEV_MACHINE_IP = 'localhost';

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const webOrigin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
export const API_BASE_URL = webOrigin && (!configuredUrl || configuredUrl === '/api')
  ? `${webOrigin}/api`
  : configuredUrl || (
  Platform.OS === 'android'
    ? 'http://10.0.2.2:5000/api'
    : `http://${DEV_MACHINE_IP}:5000/api`);

const localWeb = webOrigin && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
if (!__DEV__ && !API_BASE_URL.startsWith('https://') && !(localWeb && API_BASE_URL === `${webOrigin}/api`)) {
  throw new Error('Release builds require HTTPS; local Docker web builds also support loopback HTTP');
}

export const SOCKET_URL = API_BASE_URL.replace(/\/api$/, '');

export const APP_CONFIG = {
  QR_REFRESH_SECONDS: 20,
  REQUEST_TIMEOUT_MS: 10000,
  APP_NAME: 'Smart Attendance',
};
