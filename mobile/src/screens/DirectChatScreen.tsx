import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import { listDirectMessages, sendDirectMessage } from "../api/dm";
import { getDashboardHome } from "../api/dashboard";
import { colors } from "../theme/colors";
import { useTranslation } from "../i18n/I18nContext";

type Props = NativeStackScreenProps<HomeStackParamList, "DirectChat">;
export function DirectChatScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Array<any>>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const [loadedMessages, home] = await Promise.all([
      listDirectMessages(route.params.conversationId),
      getDashboardHome(),
    ]);
    setMessages(loadedMessages);
    setCurrentUserId(home.user.id);
    setLoading(false);
  }, [route.params.conversationId]);
  useEffect(() => { load(); }, [load]);
  return <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: undefined })} keyboardVerticalOffset={Platform.OS === "ios" ? 6 : 0}>
      <View style={styles.top}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text}/>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{route.params.title}</Text>
        <View style={{width:34}}/>
      </View>
      {loading ? <ActivityIndicator style={{marginTop:20}} color={colors.coral}/> : <FlatList
        data={messages}
        keyExtractor={(i)=>String(i.id)}
        contentContainerStyle={styles.list}
        renderItem={({item}) => {
          const mine = currentUserId != null && item.sender_user_id === currentUserId;
          const time = item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
          return (
            <View style={[styles.messageRow, mine ? styles.rowRight : styles.rowLeft]}>
              {!mine ? <Text style={styles.senderName}>{route.params.title}</Text> : null}
              <View style={[styles.msg, mine ? styles.myBubble : styles.otherBubble]}>
                <Text style={[styles.messageText, mine ? styles.myText : styles.otherText]}>{item.content}</Text>
                <Text style={[styles.timeText, mine ? styles.myTimeText : styles.otherTimeText]}>{time}</Text>
              </View>
            </View>
          );
        }}
      />}
      <View style={styles.bar}>
        <TextInput value={text} onChangeText={setText} style={styles.input} placeholder={t("writeAMessage")} placeholderTextColor={colors.textMuted} />
        <Pressable
          style={[styles.send, (sending || !text.trim()) && styles.sendDisabled]}
          disabled={sending || !text.trim()}
          onPress={async()=>{
            const content = text.trim();
            if (!content || sending) return;
            setSending(true);
            const optimistic = { id: `tmp-${Date.now()}`, sender_user_id: currentUserId, content, created_at: new Date().toISOString() };
            setMessages((prev) => [...prev, optimistic]);
            setText("");
            try {
              const saved = await sendDirectMessage(route.params.conversationId, content);
              setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
            } finally {
              setSending(false);
            }
          }}>
          <Ionicons name="send" size={16} color="#fff"/>
          <Text style={styles.sendText}>{t("send")}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.backgroundSoft},
  flex: { flex: 1 },
  top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:"#EEF2FF",backgroundColor:colors.white},
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  title:{fontWeight:"800",fontSize:17,color:colors.text,flex:1,textAlign:"center",marginHorizontal:8},
  list:{padding:16,gap:10,paddingBottom:20},
  messageRow: { maxWidth: "80%" },
  rowLeft: { alignSelf: "flex-start" },
  rowRight: { alignSelf: "flex-end" },
  senderName: { fontSize: 12, color: colors.textMuted, marginBottom: 4, marginLeft: 4, fontWeight: "700" },
  msg:{paddingHorizontal:12,paddingVertical:10,borderRadius:14,borderWidth:1},
  myBubble: { backgroundColor: colors.coral, borderColor: colors.coral, borderBottomRightRadius: 6 },
  otherBubble: { backgroundColor: colors.white, borderColor:"#E8ECF4", borderBottomLeftRadius: 6 },
  messageText: { fontSize: 14, lineHeight: 20 },
  myText: { color: "#fff" },
  otherText: { color: colors.text },
  timeText: { fontSize: 11, marginTop: 6, alignSelf: "flex-end" },
  myTimeText: { color: "rgba(255,255,255,0.85)" },
  otherTimeText: { color: colors.textMuted },
  bar:{flexDirection:"row",padding:12,gap:8,backgroundColor:colors.white,borderTopWidth:1,borderTopColor:"#EEF2FF"},
  input:{flex:1,backgroundColor:"#F8FAFC",borderRadius:12,paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:"#E8ECF4",color:colors.text},
  send:{backgroundColor:colors.coral,borderRadius:12,paddingHorizontal:12,justifyContent:"center",alignItems:"center",flexDirection:"row",gap:6},
  sendText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  sendDisabled: { opacity: 0.6 },
});
