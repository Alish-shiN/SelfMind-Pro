import { ApiError } from "../api/client";

export const SHORT_API_TIMEOUT_MS = 8000;
export const STARTUP_API_TIMEOUT_MS = 5500;
export const CREATE_API_TIMEOUT_MS = 30000;

export type OfflineTimeoutError = Error & { code: "OFFLINE_TIMEOUT" };

export function createOfflineTimeoutError(message = "Request timeout") {
  const err = new Error(message) as OfflineTimeoutError;
  err.code = "OFFLINE_TIMEOUT";
  return err;
}

export async function withOfflineTimeout<T>(
  promise: Promise<T>,
  timeoutMs = SHORT_API_TIMEOUT_MS,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(createOfflineTimeoutError());
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export async function getNetworkOfflineState() {
  try {
    const netInfo = require("@react-native-community/netinfo");
    const state = await netInfo.fetch();
    return state?.isConnected === false;
  } catch {
    return null as boolean | null;
  }
}

export function isOfflineLikeError(error: unknown) {
  if ((error as OfflineTimeoutError)?.code === "OFFLINE_TIMEOUT") return true;
  if (error instanceof ApiError && error.status === 0) return true;
  return false;
}
