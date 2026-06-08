import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import { getMyNotifications, updateNotificationStatus } from "../api/user";
import { apiFetch } from "../api/client";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<HomeStackParamList, "Notifications">;

export function NotificationsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const load = useCallback(async () => {
    setLoading(true);
    const data = await getMyNotifications();
    setItems(data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    (async () => {
      const data = await getMyNotifications();
      const unread = data.filter((item) => item.status === "unread");
      await Promise.all(unread.map((item) => updateNotificationStatus(item.id, "read").catch(() => undefined)));
      await load();
    })();
  }, [load]);

  const act = async (notification: any, action: "accepted" | "rejected") => {
    const match = notification.body.match(/request\./i);
    const requestId = Number(notification.body.match(/#(\d+)/)?.[1]);
    if (!requestId || !match) return;
    await apiFetch(`/users/friends/requests/${requestId}`, { method: "PATCH", auth: true, body: JSON.stringify({ action }) });
    await updateNotificationStatus(notification.id, "read");
    await load();
  };

  return <SafeAreaView style={styles.safe}>
    <View style={styles.top}><Pressable onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable><Text style={styles.title}>Notifications</Text><View style={{width:22}} /></View>
    {loading ? <ActivityIndicator style={{marginTop:20}} color={colors.coral}/> : <ScrollView contentContainerStyle={styles.body}>
      {items.map((n) => <View key={n.id} style={styles.card}>
        <Text style={styles.ntitle}>{n.title}</Text>
        <Text style={styles.nbody}>{n.body}</Text>
        {n.kind === "friend_request" && n.status === "unread" ? <View style={styles.row}>
          <Pressable style={styles.btn} onPress={() => act(n, "accepted")}><Text style={styles.btnText}>Accept</Text></Pressable>
          <Pressable style={[styles.btn,{backgroundColor:"#9CA3AF"}]} onPress={() => act(n, "rejected")}><Text style={styles.btnText}>Decline</Text></Pressable>
        </View> : <Pressable onPress={() => updateNotificationStatus(n.id, "read").then(load)}><Text style={styles.mark}>{n.status === "read" ? "Read" : "Mark as read"}</Text></Pressable>}
      </View>)}
    </ScrollView>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({safe:{flex:1,backgroundColor:colors.backgroundSoft},top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:16},title:{fontSize:17,fontWeight:"800",color:colors.text},body:{padding:16,gap:10},card:{backgroundColor:"#fff",padding:12,borderRadius:12,borderWidth:1,borderColor:"#E8ECF4"},ntitle:{fontWeight:"800",color:colors.text},nbody:{marginTop:4,color:colors.textMuted},row:{flexDirection:"row",gap:8,marginTop:10},btn:{backgroundColor:colors.coral,paddingVertical:8,paddingHorizontal:12,borderRadius:10},btnText:{color:"#fff",fontWeight:"700"},mark:{marginTop:8,color:colors.coral,fontWeight:"700"}});
