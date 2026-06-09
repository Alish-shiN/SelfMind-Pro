import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL, API_PREFIX } from '../constants/config';
import { getToken } from '../lib/storage';
import { ApiError, apiFetch } from './client';
import type { UserResponse } from './auth';

export type PreferredReflectionFormat = 'diary' | 'chat' | 'quiz';
export type ReminderFrequency = 'daily' | 'few_times_week' | 'weekly' | 'none';
export type AITone = 'calm' | 'practical' | 'motivating' | 'reflective';

export type CommunityProfileVisibility = 'anonymous' | 'members' | 'public';

export type PrivacyPreferences = {
  journal_private_default: boolean;
  anonymous_community_default: boolean;
  share_ai_insights: boolean;
  community_profile_visibility: CommunityProfileVisibility;
  ai_processing_consent: boolean;
  privacy_notice_accepted: boolean;
  privacy_notice_version: string | null;
  privacy_notice_accepted_at: string | null;
  private_account: boolean;
  only_friends_can_message: boolean;
};

export type UserPreferences = {
  emotional_goals: string[];
  preferred_reflection_format: PreferredReflectionFormat;
  reminder_frequency: ReminderFrequency;
  privacy_preferences: PrivacyPreferences;
  ai_tone: AITone;
  onboarding_completed: boolean;
  onboarding_skipped: boolean;
};

export type UserPreferencesUpdate = Partial<UserPreferences>;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  emotional_goals: [],
  preferred_reflection_format: 'diary',
  reminder_frequency: 'none',
  privacy_preferences: {
    journal_private_default: true,
    anonymous_community_default: false,
    share_ai_insights: false,
    community_profile_visibility: 'members',
    ai_processing_consent: false,
    privacy_notice_accepted: false,
    privacy_notice_version: null,
    privacy_notice_accepted_at: null,
    private_account: true,
    only_friends_can_message: true,
  },
  ai_tone: 'calm',
  onboarding_completed: false,
  onboarding_skipped: false,
};

export function getCurrentUser() {
  return apiFetch<UserResponse>('/users/me', { auth: true });
}

export function getUserPreferences() {
  return apiFetch<UserPreferences>('/users/me/preferences', { auth: true });
}

export function updateUserPreferences(payload: UserPreferencesUpdate) {
  return apiFetch<UserPreferences>('/users/me/preferences', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export type PersonalExportType = 'full' | 'journal' | 'mood' | 'insights' | 'weekly_report';

export type PrivacyCenterResponse = {
  notice_version: string;
  notice: {
    title: string;
    summary: string;
    emotional_data_notice: string;
    ai_processing: string[];
    stored_data: string[];
    controls: string[];
  };
  preferences: UserPreferences;
  export_options?: Array<{ type: PersonalExportType; label: string; formats: string[] }>;
};

export function getPrivacyCenter() {
  return apiFetch<PrivacyCenterResponse>('/users/me/privacy-center', { auth: true });
}

export function acceptPrivacyNotice() {
  return apiFetch<UserPreferences>('/users/me/privacy-notice/accept', {
    method: 'POST',
    auth: true,
  });
}

export type WeeklyReflectionReport = {
  exported_at: string;
  export_type: 'weekly_report';
  date_range: { start_date: string; end_date: string };
  has_enough_data: boolean;
  fallback_message: string | null;
  mood_overview: { entries_count: number; average_mood: number; min_mood: number; max_mood: number; trend: string } | null;
  emotional_patterns: Array<{ emotion_label: string; count: number }>;
  reflection_summary: string | null;
  suggested_focus_next_week: string;
  insights_summary?: Array<Record<string, unknown>>;
};

export function exportPersonalData(exportType: PersonalExportType = 'full') {
  return apiFetch<Record<string, unknown>>(`/users/me/export?export_type=${exportType}`, { auth: true });
}

export function getWeeklyReflectionReport() {
  return apiFetch<WeeklyReflectionReport>('/users/me/export?export_type=weekly_report', { auth: true });
}

export async function downloadWeeklyPdfReport() {
  const token = await getToken();
  const fileName = 'selfmind_weekly_report.pdf';
  const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDirectory) {
    throw new ApiError('Local file storage is unavailable on this device.', 0);
  }

  const localUri = `${baseDirectory}${fileName}`;
  const result = await FileSystem.downloadAsync(
    `${API_BASE_URL}${API_PREFIX}/users/me/export?export_type=weekly_report&format=pdf`,
    localUri,
    {
      headers: {
        Accept: 'application/pdf',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  const contentType = result.headers['content-type'] ?? result.headers['Content-Type'] ?? '';
  if (result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new ApiError(`Could not download weekly PDF report (HTTP ${result.status}).`, result.status);
  }
  if (!contentType.toLowerCase().includes('application/pdf')) {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
    throw new ApiError('Weekly report download did not return a PDF file.', 0, contentType);
  }

  const info = await FileSystem.getInfoAsync(result.uri);
  return {
    localUri: result.uri,
    fileName,
    size: info.exists ? info.size ?? 0 : 0,
    contentType,
  };
}

export function deleteAccount() {
  return apiFetch<void>('/users/me', {
    method: 'DELETE',
    auth: true,
    body: JSON.stringify({ confirmation: 'DELETE' }),
  });
}


export type AccountInfo = { email: string; username: string; member_since: string; birthday: string | null; country: string | null; bio: string | null; avatar_url: string | null };
export function getAccountInfo() { return apiFetch<AccountInfo>("/users/me/account", { auth: true }); }
export function updateAccountInfo(payload: { birthday?: string | null; country?: string | null; bio?: string | null }) { return apiFetch<AccountInfo>("/users/me/account", { method: "PUT", auth: true, body: JSON.stringify(payload) }); }
export async function uploadAvatar(uri: string, name: string, type: string) { const fd = new FormData(); fd.append("file", { uri, name, type } as any); return apiFetch<AccountInfo>("/users/me/avatar", { method: "POST", auth: true, body: fd as any }); }
export type PublicMiniProfile = {
  id: number;
  username: string;
  avatar_url: string | null;
  is_own_profile: boolean;
  is_friend: boolean;
  friend_request_status: "none" | "pending_sent" | "pending_received" | "accepted";
  can_message: boolean;
  can_view_private_profile: boolean;
  is_private_account: boolean;
  only_friends_can_message: boolean;
  country: string | null;
  bio: string | null;
  birth_date?: string | null;
  member_since: string;
  private_account: boolean;
  public_safe_preferences?: { community_profile_visibility?: string; anonymous_community_default?: boolean } | null;
  public_safe_stats?: { goals_count?: number } | null;
  friends_count: number;
};
export function getPublicProfile(userId: number){ return apiFetch<PublicMiniProfile>(`/users/public-profile/${userId}`, { auth: true }); }
export function sendFriendRequest(target_user_id: number) {
  return apiFetch<{ status: string; request_id: number }>("/users/friends/requests", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ target_user_id }),
  });
}
export type InAppNotification = {
  id: number;
  user_id: number;
  kind: string;
  title: string;
  body: string;
  status: "read" | "unread";
  created_at: string;
};
export function getMyNotifications() {
  return apiFetch<InAppNotification[]>("/users/notifications", { auth: true });
}
export function updateNotificationStatus(notificationId: number, status: "read" | "unread") {
  return apiFetch<{ id: number; status: "read" | "unread" }>(`/users/notifications/${notificationId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ status }),
  });
}
export function resolveMediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url}`;
}
