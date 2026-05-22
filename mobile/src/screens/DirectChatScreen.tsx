import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "../navigation/types";
import { listDirectMessages, sendDirectMessage } from "../api/dm";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<HomeStackParamList, "DirectChat">;
export function DirectChatScreen({ navigation, route }: Props) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setMessages(await listDirectMessages(route.params.conversationId));
    setLoading(false);
  }, [route.params.conversationId]);
  useEffect(() => { load(); }, [load]);
  return <SafeAreaView style={styles.safe}>
    <View style={styles.top}><Pressable onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={22} color={colors.text}/></Pressable><Text style={styles.title}>{route.params.title}</Text><View style={{width:22}}/></View>
    {loading ? <ActivityIndicator style={{marginTop:20}} color={colors.coral}/> : <FlatList data={messages} keyExtractor={(i)=>String(i.id)} renderItem={({item}) => <View style={styles.msg}><Text>{item.content}</Text></View>} contentContainerStyle={{padding:16,gap:8}}/>}
    <View style={styles.bar}><TextInput value={text} onChangeText={setText} style={styles.input} placeholder="Write a message…" /><Pressable style={styles.send} onPress={async()=>{ if(!text.trim())return; await sendDirectMessage(route.params.conversationId,text.trim()); setText(""); load(); }}><Ionicons name="send" size={16} color="#fff"/></Pressable></View>
  </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.backgroundSoft},top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:16},title:{fontWeight:"800",fontSize:17,color:colors.text},msg:{backgroundColor:"#fff",padding:10,borderRadius:10,borderWidth:1,borderColor:"#E8ECF4"},bar:{flexDirection:"row",padding:12,gap:8},input:{flex:1,backgroundColor:"#fff",borderRadius:10,padding:10,borderWidth:1,borderColor:"#E8ECF4"},send:{backgroundColor:colors.coral,borderRadius:10,paddingHorizontal:12,justifyContent:"center"}});
