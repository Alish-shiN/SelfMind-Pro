import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ApiError } from "../api/client";
import { createChatSession, getChatSessionDetail, getMyChatSessions, type ChatSessionResponse } from "../api/chat";
import { listDirectConversations } from "../api/dm";
import { useAuth } from "../context/AuthContext";
import type { HomeStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<HomeStackParamList, "AiChatHistory">;

type SessionListItem = ChatSessionResponse & { last_message_preview?: string | null; message_count?: number };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function AiChatHistoryScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directConversations, setDirectConversations] = useState<any[]>([]);

  const loadSessions = useCallback(async (pullToRefresh = false) => {
    try {
      if (pullToRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const [result, dmConvs] = await Promise.all([getMyChatSessions(), listDirectConversations()]);
      const enriched = await Promise.all(result.map(async (session) => {
        try {
          const detail = await getChatSessionDetail(session.id);
          const last = detail.messages[detail.messages.length - 1];
          return { ...session, last_message_preview: last?.content ?? null, message_count: detail.messages.length };
        } catch {
          return { ...session, last_message_preview: null, message_count: undefined };
        }
      }));
      setSessions(enriched as SessionListItem[]);
      setDirectConversations(dmConvs);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        await signOut("sessionExpired");
        return;
      }
      setError(e instanceof ApiError ? e.message : "Could not load chat history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [signOut]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const onNewChat = useCallback(async () => {
    try {
      setCreating(true);
      const session = await createChatSession("New conversation");
      navigation.navigate("AiChat", { sessionId: session.id, title: session.title });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        await signOut("sessionExpired");
        return;
      }
      setError(e instanceof ApiError ? e.message : "Could not create a new chat.");
    } finally {
      setCreating(false);
    }
  }, [navigation, signOut]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <Pressable style={[styles.newButton, creating && { opacity: 0.7 }]} onPress={onNewChat} disabled={creating}>
          {creating ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="add" size={18} color="#fff" />}
          <Text style={styles.newButtonText}>New Chat</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => loadSessions()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.coral} /></View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={sessions.length === 0 ? styles.emptyList : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSessions(true)} tintColor={colors.coral} />}
          ListHeaderComponent={directConversations.length ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
              <Text style={{ color: colors.textMuted, fontWeight: "800" }}>Direct messages</Text>
              {directConversations.map((conv) => (
                <Pressable key={conv.id} style={styles.chatCard} onPress={() => navigation.navigate("DirectChat", { conversationId: conv.id, title: conv.other_username })}>
                  <Text style={styles.chatTitle}>{conv.other_username}</Text>
                  <Text style={styles.chatPreview} numberOfLines={1}>Tap to open conversation</Text>
                  <Text style={styles.chatDate}>{formatDate(conv.updated_at || conv.created_at)}</Text>
                </Pressable>
              ))}
              <Text style={{ color: colors.textMuted, fontWeight: "800", marginTop: 8 }}>AI chat sessions</Text>
            </View>
          ) : null}
          renderItem={({ item }) => (
            <Pressable
              style={styles.chatCard}
              onPress={() => navigation.navigate("AiChat", { sessionId: item.id, title: item.title })}
            >
              <Text style={styles.chatTitle}>{item.title || "Conversation"}</Text>
              <Text style={styles.chatPreview} numberOfLines={1}>
                {item.last_message_preview || (item.message_count === 0 ? "No messages yet" : "Tap to open conversation")}
              </Text>
              <Text style={styles.chatDate}>{formatDate(item.updated_at || item.created_at)}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={42} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Start your first conversation</Text>
              <Text style={styles.emptySubtitle}>Your AI chat sessions will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundSoft },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "900", color: colors.text },
  newButton: { backgroundColor: colors.coral, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6 },
  newButtonText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  errorBox: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, backgroundColor: "#FFE5E5" },
  errorText: { color: "#B91C1C", fontWeight: "700", marginBottom: 8 },
  retryButton: { alignSelf: "flex-start", backgroundColor: colors.coral, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  retryText: { color: "#fff", fontWeight: "800" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 10 },
  emptyList: { flexGrow: 1, justifyContent: "center", padding: 16 },
  chatCard: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: "#EEF2FF", padding: 14 },
  chatTitle: { color: colors.text, fontWeight: "800", fontSize: 15, marginBottom: 4 },
  chatPreview: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  chatDate: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  emptyState: { alignItems: "center" },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: "900", color: colors.text },
  emptySubtitle: { marginTop: 6, fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
