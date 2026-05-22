import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";
import { getAccountInfo, resolveMediaUrl, updateAccountInfo, uploadAvatar } from "../api/user";

type Props = NativeStackScreenProps<RootStackParamList, "ProfileAccountInfo">;

export function ProfileAccountInfoScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [birthday, setBirthday] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getAccountInfo();
    setData(r);
    setAvatarLoadFailed(false);
    setBirthday(r.birthday || "");
    setCountry(r.country || "");
    setBio(r.bio || "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const pickAvatar = async () => {
    const ImagePicker: any = require("expo-image-picker");
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.uri) return;
    const fileName = asset.fileName || "avatar.jpg";
    const fileType = asset.mimeType || "image/jpeg";
    await uploadAvatar(asset.uri, fileName, fileType);
    load();
  };

  const save = async () => {
    setSaving(true);
    await updateAccountInfo({ birthday: birthday || null, country: country || null, bio: bio || null });
    await load();
    setSaving(false);
  };

  const avatarUri = resolveMediaUrl(data?.avatar_url);
  const shiftBirthday = (days: number) => {
    const base = birthday ? new Date(`${birthday}T00:00:00`) : new Date();
    base.setDate(base.getDate() + days);
    setBirthday(base.toISOString().slice(0, 10));
  };
  return <SafeAreaView style={styles.safe}>
    <View style={styles.top}><Pressable onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable><Text style={styles.title}>Account information</Text><View style={{width:22}} /></View>
    {loading ? <ActivityIndicator style={{marginTop:24}} color={colors.coral} /> : <ScrollView contentContainerStyle={styles.body}>
      <Pressable onPress={pickAvatar} style={styles.avatar}>{avatarUri && !avatarLoadFailed ? <Image source={{ uri: avatarUri }} style={styles.avatarImg} onError={() => setAvatarLoadFailed(true)} /> : <Text style={styles.avatarTxt}>{(data?.username||"?")[0]?.toUpperCase()}</Text>}</Pressable>
      <Text style={styles.readonly}>Email: {data?.email}</Text>
      <Text style={styles.readonly}>Username: {data?.username}</Text>
      <Text style={styles.readonly}>Member since: {new Date(data?.member_since).toLocaleDateString()}</Text>
      <Pressable style={styles.input} onPress={() => setShowBirthdayPicker(true)}>
        <Text style={{ color: birthday ? colors.text : colors.textPlaceholder }}>
          {birthday || "Birthday (YYYY-MM-DD)"}
        </Text>
      </Pressable>
      <TextInput value={country} onChangeText={setCountry} placeholder="Country" style={styles.input} />
      <TextInput value={bio} onChangeText={setBio} placeholder="About me" style={[styles.input,{height:100}]} multiline />
      <Pressable onPress={save} style={styles.btn}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnTxt}>Save</Text>}</Pressable>
    </ScrollView>}
    <Modal visible={showBirthdayPicker} transparent animationType="fade">
      <View style={styles.dateBackdrop}>
        <View style={styles.dateCard}>
          <Text style={styles.dateTitle}>Select birthday</Text>
          <View style={styles.dateRow}>
            <Pressable style={styles.dateBtn} onPress={() => shiftBirthday(-1)}><Text>−1 day</Text></Pressable>
            <Text style={styles.dateValue}>{birthday || new Date().toISOString().slice(0, 10)}</Text>
            <Pressable style={styles.dateBtn} onPress={() => shiftBirthday(1)}><Text>+1 day</Text></Pressable>
          </View>
          <View style={styles.dateActions}>
            <Pressable onPress={() => setShowBirthdayPicker(false)}><Text style={styles.cancel}>Cancel</Text></Pressable>
            <Pressable onPress={() => { if (!birthday) setBirthday(new Date().toISOString().slice(0, 10)); setShowBirthdayPicker(false); }}><Text style={styles.apply}>Apply</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({safe:{flex:1,backgroundColor:colors.backgroundSoft},top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:16},title:{fontWeight:"800",fontSize:17,color:colors.text},body:{padding:16,gap:12},avatar:{width:88,height:88,borderRadius:44,borderWidth:2,borderColor:colors.coral,justifyContent:"center",alignItems:"center",alignSelf:"center",overflow:"hidden",backgroundColor:"#fff"},avatarImg:{width:"100%",height:"100%"},avatarTxt:{fontWeight:"900",fontSize:28,color:colors.text},readonly:{color:colors.text,fontWeight:"700"},input:{backgroundColor:"#fff",borderRadius:12,borderWidth:1,borderColor:"#E8ECF4",padding:12,color:colors.text},btn:{backgroundColor:colors.coral,borderRadius:12,padding:12,alignItems:"center"},btnTxt:{color:"#fff",fontWeight:"800"},dateBackdrop:{flex:1,backgroundColor:"rgba(0,0,0,0.25)",justifyContent:"center",padding:24},dateCard:{backgroundColor:"#fff",borderRadius:16,padding:16,gap:12},dateTitle:{fontWeight:"800",fontSize:16,color:colors.text},dateRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},dateBtn:{padding:10,backgroundColor:"#F3F4F6",borderRadius:10},dateValue:{fontWeight:"700",color:colors.text},dateActions:{flexDirection:"row",justifyContent:"flex-end",gap:20},cancel:{color:colors.textMuted,fontWeight:"700"},apply:{color:colors.coral,fontWeight:"900"}})
