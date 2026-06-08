import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "@selfmind/token";
const ONBOARDING_KEY = "@selfmind/onboarding_done";
const TRUSTED_PERSON_PHONE_KEY = "selfmind:trusted_person_phone";
const ACHIEVEMENT_PRIVACY_READY_KEY = "selfmind:achievement_privacy_ready";
const ACHIEVEMENT_WEEKLY_MOOD_REVIEW_KEY =
  "selfmind:achievement_weekly_mood_review";
const ACHIEVEMENT_WEEKLY_SUMMARY_COMPLETED_KEY =
  "selfmind:achievement_weekly_summary_completed";
const ACHIEVEMENT_GOAL_PAUSED_KEY = "selfmind:achievement_goal_paused";

function secureKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, "_");
}

export async function getToken(): Promise<string | null> {
  const secureToken = await SecureStore.getItemAsync(secureKey(TOKEN_KEY));
  if (secureToken) return secureToken;
  const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
  if (legacyToken) {
    await SecureStore.setItemAsync(secureKey(TOKEN_KEY), legacyToken);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
  return legacyToken;
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(secureKey(TOKEN_KEY), token);
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(secureKey(TOKEN_KEY)),
    AsyncStorage.removeItem(TOKEN_KEY),
  ]);
  await purgeSensitiveLocalCaches();
}

export async function purgeSensitiveLocalCaches(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const exactKeys = new Set([
    "offline_journal_entries_v1",
    "cached_server_journal_entries_v1",
    "home_dashboard_cache_v1",
    "dashboard_home_cache_v1",
    "ai_quiz_cache_v1",
    "archive_search_cache_v1",
    "goals_screen_cache_v1",
    "profile_screen_cache_v1",
  ]);
  const sensitiveKeys = keys.filter(
    (key) =>
      exactKeys.has(key) ||
      key.startsWith("ai_chat_session_cache_v1_") ||
      key.startsWith("dashboard_mood_analytics_cache_v1_"),
  );
  if (sensitiveKeys.length > 0) {
    await AsyncStorage.multiRemove(sensitiveKeys);
  }
}

export async function getOnboardingComplete(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ONBOARDING_KEY);
  return v === "1";
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, "1");
}

function trustedPersonPhoneKey(userId: number | string): string {
  return `${TRUSTED_PERSON_PHONE_KEY}:${userId}`;
}

export async function getTrustedPersonPhone(userId?: number | string | null): Promise<string | null> {
  if (userId === undefined || userId === null || userId === "") return null;
  const key = trustedPersonPhoneKey(userId);
  const securePhone = await SecureStore.getItemAsync(secureKey(key));
  if (securePhone) return securePhone;
  const legacyPhone = await AsyncStorage.getItem(key);
  if (legacyPhone) {
    await SecureStore.setItemAsync(secureKey(key), legacyPhone);
    await AsyncStorage.removeItem(key);
  }
  return legacyPhone;
}

export async function setTrustedPersonPhone(
  phone: string,
  userId?: number | string | null,
): Promise<void> {
  if (userId === undefined || userId === null || userId === "") {
    throw new Error("A user id is required to save trusted person phone.");
  }
  const normalized = phone.trim();
  const userKey = trustedPersonPhoneKey(userId);
  if (!normalized) {
    await SecureStore.deleteItemAsync(secureKey(userKey));
    await AsyncStorage.removeItem(userKey);
    await AsyncStorage.removeItem(TRUSTED_PERSON_PHONE_KEY);
    return;
  }
  await SecureStore.setItemAsync(secureKey(userKey), normalized);
  await AsyncStorage.removeItem(userKey);
  await AsyncStorage.removeItem(TRUSTED_PERSON_PHONE_KEY);
}

async function getBooleanFlag(key: string): Promise<boolean> {
  return (await AsyncStorage.getItem(key)) === "1";
}

async function setBooleanFlag(key: string): Promise<void> {
  await AsyncStorage.setItem(key, "1");
}

export async function getAchievementPrivacyReady(): Promise<boolean> {
  return getBooleanFlag(ACHIEVEMENT_PRIVACY_READY_KEY);
}

export async function setAchievementPrivacyReady(): Promise<void> {
  await setBooleanFlag(ACHIEVEMENT_PRIVACY_READY_KEY);
}

export async function getAchievementWeeklyMoodReview(): Promise<boolean> {
  return getBooleanFlag(ACHIEVEMENT_WEEKLY_MOOD_REVIEW_KEY);
}

export async function setAchievementWeeklyMoodReview(): Promise<void> {
  await setBooleanFlag(ACHIEVEMENT_WEEKLY_MOOD_REVIEW_KEY);
}

export async function getAchievementWeeklySummaryCompleted(): Promise<boolean> {
  return getBooleanFlag(ACHIEVEMENT_WEEKLY_SUMMARY_COMPLETED_KEY);
}

export async function setAchievementWeeklySummaryCompleted(): Promise<void> {
  await setBooleanFlag(ACHIEVEMENT_WEEKLY_SUMMARY_COMPLETED_KEY);
}

export async function getAchievementGoalPaused(): Promise<boolean> {
  return getBooleanFlag(ACHIEVEMENT_GOAL_PAUSED_KEY);
}

export async function setAchievementGoalPaused(): Promise<void> {
  await setBooleanFlag(ACHIEVEMENT_GOAL_PAUSED_KEY);
}
