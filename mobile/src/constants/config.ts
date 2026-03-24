import { Platform } from 'react-native';

/**
 * Base URL for the FastAPI backend (no trailing slash).
 * - Android emulator: use 10.0.2.2 to reach the host machine's localhost.
 * - iOS simulator: localhost works.
 * - Physical device: set EXPO_PUBLIC_API_URL to your machine's LAN IP, e.g. http://192.168.1.10:8000
 */
const fromEnv = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL =
  fromEnv?.replace(/\/$/, '') ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000');

export const API_PREFIX = '/api/v1';
