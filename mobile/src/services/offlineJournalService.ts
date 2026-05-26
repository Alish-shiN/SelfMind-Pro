import AsyncStorage from "@react-native-async-storage/async-storage";

const OFFLINE_JOURNAL_KEY = "offline_journal_entries_v1";
const CACHED_SERVER_JOURNAL_KEY = "cached_server_journal_entries_v1";

export type OfflineSyncStatus = "pending" | "synced" | "failed";

export type OfflineJournalEntry = {
  local_id: string;
  server_id: number | null;
  title: string;
  content: string;
  mood_score: number;
  tags: string[];
  is_private: boolean;
  created_at: string;
  updated_at: string;
  sync_status: OfflineSyncStatus;
  sync_in_progress?: boolean;
  sync_started_at?: string | null;
};

const SYNC_STALE_MS = 2 * 60 * 1000;
let syncInFlight: Promise<void> | null = null;
const OFFLINE_DUPLICATE_WINDOW_MS = 10 * 1000;

async function readAll() {
  const raw = await AsyncStorage.getItem(OFFLINE_JOURNAL_KEY);
  if (!raw) return [] as OfflineJournalEntry[];
  try {
    const parsed = JSON.parse(raw) as OfflineJournalEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(entries: OfflineJournalEntry[]) {
  await AsyncStorage.setItem(OFFLINE_JOURNAL_KEY, JSON.stringify(entries));
}

export async function saveOfflineJournalEntry(
  payload: Omit<
    OfflineJournalEntry,
    "local_id" | "server_id" | "sync_status" | "sync_in_progress" | "sync_started_at"
  >,
) {
  const current = await readAll();
  const nowMs = Date.now();
  const titleNorm = payload.title.trim().toLowerCase();
  const contentNorm = payload.content.trim().toLowerCase();
  const duplicate = current.find((entry) => {
    if (!(entry.sync_status === "pending" || entry.sync_status === "failed")) {
      return false;
    }
    const createdMs = Date.parse(entry.created_at);
    if (!Number.isFinite(createdMs)) return false;
    const recentEnough = nowMs - createdMs <= OFFLINE_DUPLICATE_WINDOW_MS;
    if (!recentEnough) return false;
    return (
      entry.title.trim().toLowerCase() === titleNorm &&
      entry.content.trim().toLowerCase() === contentNorm &&
      entry.mood_score === payload.mood_score
    );
  });
  if (duplicate) {
    return duplicate;
  }

  const entry: OfflineJournalEntry = {
    ...payload,
    local_id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    server_id: null,
    sync_status: "pending",
    sync_in_progress: false,
    sync_started_at: null,
  };
  current.unshift(entry);
  await writeAll(current);
  return entry;
}

export async function getOfflineJournalEntries() {
  return readAll();
}

export async function updateOfflineJournalEntry(
  localId: string,
  updates: Partial<OfflineJournalEntry>,
) {
  const current = await readAll();
  const next = current.map((entry) =>
    entry.local_id === localId ? { ...entry, ...updates } : entry,
  );
  await writeAll(next);
}

export async function syncPendingJournalEntries(
  createOnline: (payload: {
    title: string;
    content: string;
    mood_score: number;
    tags: string[];
    is_private: boolean;
    language?: string;
  }) => Promise<{ id: number }>,
  language?: string,
) {
  if (syncInFlight) {
    return syncInFlight;
  }

  if (__DEV__) console.log("[offline-journal] sync start");
  syncInFlight = (async () => {
    const current = await readAll();
    const candidates = current.filter(
      (entry) => entry.sync_status === "pending" || entry.sync_status === "failed",
    );

    for (const candidate of candidates) {
      if (__DEV__) {
        console.log("[offline-journal] sync candidate", {
          local_id: candidate.local_id,
        });
      }
      const latestAll = await readAll();
      const latest = latestAll.find((item) => item.local_id === candidate.local_id);
      if (!latest) continue;
      if (latest.server_id || latest.sync_status === "synced") continue;

      const startedAtMs = latest.sync_started_at
        ? Date.parse(latest.sync_started_at)
        : NaN;
      const isStaleLock =
        Number.isFinite(startedAtMs) && Date.now() - startedAtMs > SYNC_STALE_MS;

      if (latest.sync_in_progress && !isStaleLock) {
        continue;
      }

      const nowIso = new Date().toISOString();
      await updateOfflineJournalEntry(latest.local_id, {
        sync_in_progress: true,
        sync_started_at: nowIso,
      });

      const checkAfterLock = (await readAll()).find(
        (item) => item.local_id === latest.local_id,
      );
      if (!checkAfterLock) continue;
      if (checkAfterLock.server_id || checkAfterLock.sync_status === "synced") {
        await updateOfflineJournalEntry(latest.local_id, {
          sync_in_progress: false,
          sync_started_at: null,
        });
        continue;
      }
      try {
        if (__DEV__) {
          console.log("[offline-journal] syncing local entry", {
            local_id: checkAfterLock.local_id,
          });
        }
        const created = await createOnline({
          title: checkAfterLock.title,
          content: checkAfterLock.content,
          mood_score: checkAfterLock.mood_score,
          tags: checkAfterLock.tags,
          is_private: checkAfterLock.is_private,
          language,
        });
        await updateOfflineJournalEntry(checkAfterLock.local_id, {
          server_id: created.id,
          sync_status: "synced",
          sync_in_progress: false,
          sync_started_at: null,
          updated_at: new Date().toISOString(),
        });
      } catch {
        await updateOfflineJournalEntry(checkAfterLock.local_id, {
          sync_status: "failed",
          sync_in_progress: false,
          sync_started_at: null,
          updated_at: new Date().toISOString(),
        });
      }
    }
  })();

  try {
    await syncInFlight;
  } finally {
    if (__DEV__) console.log("[offline-journal] sync end");
    syncInFlight = null;
  }
}

export type CachedServerJournalEntry = {
  id: number;
  title: string;
  content: string;
  mood_score: number;
  tags: string[] | null;
  is_private: boolean;
  push_notification_enabled: boolean;
  notification_title: string | null;
  notification_time: string | null;
  created_at: string;
  updated_at: string;
};

export async function saveCachedServerJournalEntries(
  entries: CachedServerJournalEntry[],
) {
  await AsyncStorage.setItem(CACHED_SERVER_JOURNAL_KEY, JSON.stringify(entries));
}

export async function getCachedServerJournalEntries() {
  const raw = await AsyncStorage.getItem(CACHED_SERVER_JOURNAL_KEY);
  if (!raw) return [] as CachedServerJournalEntry[];
  try {
    const parsed = JSON.parse(raw) as CachedServerJournalEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
