import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { sendPasswordResetEmail } from "firebase/auth";
import { PillInput } from "../components/PillInput";
import { firebaseAuth } from "../lib/firebase";
import { colors } from "../theme/colors";
import { useTranslation } from "../i18n/I18nContext";
import type { ForgotPasswordScreenProps } from "../navigation/types";

export function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || loading) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, normalizedEmail);
      Alert.alert(t("resetPasswordTitle"), t("resetPasswordEmailSent"));
    } catch {
      Alert.alert(t("error"), t("firebaseAuthErrorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
          <Text style={styles.backText}>{t("back")}</Text>
        </Pressable>
        <View style={styles.inner}>
          <Text style={styles.title}>{t("resetPasswordTitle")}</Text>
          <Text style={styles.subtitle}>{t("resetPasswordMessage")}</Text>
          <PillInput label={t("email")} icon={<Ionicons name="mail-outline" size={20} color={colors.text} />} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={onReset} disabled={loading}>{loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>{t("forgotPassword")}</Text>}</Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},kav:{flex:1},back:{flexDirection:"row",alignItems:"center",padding:16},backText:{color:colors.text,fontSize:16},inner:{padding:24},title:{fontSize:26,fontWeight:"700",color:colors.text},subtitle:{marginTop:8,marginBottom:16,color:colors.textMuted},button:{marginTop:8,backgroundColor:colors.coralButton,borderRadius:999,paddingVertical:14,alignItems:"center"},buttonDisabled:{opacity:0.7},buttonText:{color:colors.white,fontWeight:"700",fontSize:16}});
