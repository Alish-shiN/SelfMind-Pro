import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";
import { getAccountInfo, resolveMediaUrl, updateAccountInfo, uploadAvatar } from "../api/user";
import { useTranslation } from "../i18n/I18nContext";

type Props = NativeStackScreenProps<RootStackParamList, "ProfileAccountInfo">;

export function ProfileAccountInfoScreen({ navigation }: Props) {
  const { t } = useTranslation();
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
  const today = new Date();
  const displayBirthday = birthday ? new Date(`${birthday}T00:00:00`).toLocaleDateString() : t("selectBirthDate");
  return <SafeAreaView style={styles.safe}>
    <View style={styles.top}><Pressable onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable><Text style={styles.title}>{t("accountInformation")}</Text><View style={{width:22}} /></View>
    {loading ? <ActivityIndicator style={{marginTop:24}} color={colors.coral} /> : <ScrollView contentContainerStyle={styles.body}>
      <Pressable onPress={pickAvatar} style={styles.avatar}>{avatarUri && !avatarLoadFailed ? <Image source={{ uri: avatarUri }} style={styles.avatarImg} onError={() => setAvatarLoadFailed(true)} /> : <Text style={styles.avatarTxt}>{(data?.username||"?")[0]?.toUpperCase()}</Text>}</Pressable>
      <Text style={styles.readonly}>{t("email")}: {data?.email}</Text>
      <Text style={styles.readonly}>{t("username")}: {data?.username}</Text>
      <Text style={styles.readonly}>{t("memberSince")}: {new Date(data?.member_since).toLocaleDateString()}</Text>
      <Pressable style={styles.input} onPress={() => setShowBirthdayPicker(true)}>
        <Text style={{ color: birthday ? colors.text : colors.textPlaceholder }}>
          {displayBirthday}
        </Text>
      </Pressable>
      <TextInput value={country} onChangeText={setCountry} placeholder={t("country")} style={styles.input} />
      <TextInput value={bio} onChangeText={setBio} placeholder={t("aboutMe")} style={[styles.input,{height:100}]} multiline />
      <Pressable onPress={save} style={styles.btn}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnTxt}>{t("save")}</Text>}</Pressable>
    </ScrollView>}
    {showBirthdayPicker ? (
      <View style={styles.datePickerBox}>
        <DateSelect
          initialValue={birthday || new Date(2000, 0, 1).toISOString().slice(0, 10)}
          onCancel={() => setShowBirthdayPicker(false)}
          onSelect={(value) => {
            if (new Date(`${value}T00:00:00`) > today) return;
            setBirthday(value);
            setShowBirthdayPicker(false);
          }}
        />
      </View>
    ) : null}
  </SafeAreaView>;
}

function DateSelect({ initialValue, onCancel, onSelect }: { initialValue: string; onCancel: () => void; onSelect: (value: string) => void }) {
  const [y, m, d] = initialValue.split("-").map(Number);
  const [year, setYear] = useState(y);
  const [month, setMonth] = useState(m);
  const [day, setDay] = useState(d);
  const years = Array.from({ length: 127 }, (_, i) => 1900 + i).reverse();
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const pad = (v: number) => String(v).padStart(2, "0");
  return <View style={styles.dateCard}><View style={styles.dateRow}>
    <ScrollView style={styles.dateCol}>{years.map((v)=><Pressable key={v} onPress={()=>setYear(v)}><Text style={[styles.dateItem, year===v && styles.dateItemOn]}>{v}</Text></Pressable>)}</ScrollView>
    <ScrollView style={styles.dateCol}>{Array.from({length:12},(_,i)=>i+1).map((v)=><Pressable key={v} onPress={()=>setMonth(v)}><Text style={[styles.dateItem, month===v && styles.dateItemOn]}>{pad(v)}</Text></Pressable>)}</ScrollView>
    <ScrollView style={styles.dateCol}>{days.map((v)=><Pressable key={v} onPress={()=>setDay(v)}><Text style={[styles.dateItem, day===v && styles.dateItemOn]}>{pad(v)}</Text></Pressable>)}</ScrollView>
  </View><View style={styles.dateActions}><Pressable onPress={onCancel}><Text>Cancel</Text></Pressable><Pressable onPress={()=>onSelect(`${year}-${pad(month)}-${pad(day)}`)}><Text style={{color:colors.coral,fontWeight:"800"}}>Apply</Text></Pressable></View></View>;
}

const styles = StyleSheet.create({safe:{flex:1,backgroundColor:colors.backgroundSoft},top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:16},title:{fontWeight:"800",fontSize:17,color:colors.text},body:{padding:16,gap:12},avatar:{width:88,height:88,borderRadius:44,borderWidth:2,borderColor:colors.coral,justifyContent:"center",alignItems:"center",alignSelf:"center",overflow:"hidden",backgroundColor:"#fff"},avatarImg:{width:"100%",height:"100%"},avatarTxt:{fontWeight:"900",fontSize:28,color:colors.text},readonly:{color:colors.text,fontWeight:"700"},input:{backgroundColor:"#fff",borderRadius:12,borderWidth:1,borderColor:"#E8ECF4",padding:12,color:colors.text},btn:{backgroundColor:colors.coral,borderRadius:12,padding:12,alignItems:"center"},btnTxt:{color:"#fff",fontWeight:"800"},datePickerBox:{position:"absolute",left:0,right:0,bottom:0,padding:16,backgroundColor:"rgba(0,0,0,0.2)"},dateCard:{backgroundColor:"#fff",borderRadius:14,padding:12},dateRow:{flexDirection:"row",gap:8,maxHeight:180},dateCol:{flex:1},dateItem:{paddingVertical:8,textAlign:"center",color:colors.textMuted},dateItemOn:{color:colors.coral,fontWeight:"800"},dateActions:{flexDirection:"row",justifyContent:"flex-end",gap:16,marginTop:8}})
