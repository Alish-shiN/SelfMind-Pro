import { useState } from "react";
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableWithoutFeedback, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { sendEmailVerification, signInWithEmailAndPassword } from "firebase/auth";
import { ApiError } from "../api/client";
import { firebaseLogin } from "../api/auth";
import { PillInput } from "../components/PillInput";
import { DecorBlobs } from "../components/DecorBlobs";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/I18nContext";
import { firebaseAuth } from "../lib/firebase";
import { isOfflineLikeError, withOfflineTimeout } from "../services/offlineNetworkService";
import type { WelcomeScreenProps } from "../navigation/types";
import { colors } from "../theme/colors";

export function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const mapFirebaseError = (code: string) => {
    if (code === "auth/invalid-credential") return t("invalidEmailOrPassword");
    if (code === "auth/user-not-found") return t("accountNotFound");
    if (code === "auth/wrong-password") return t("invalidPassword");
    return t("firebaseAuthErrorGeneric");
  };

  const resendVerificationEmail = async () => {
    const user = firebaseAuth.currentUser;
    if (!user) {
      Alert.alert(t("error"), t("firebaseAuthErrorGeneric"));
      return;
    }
    setResendingVerification(true);
    try {
      await sendEmailVerification(user);
      Alert.alert(t("verifyEmailTitle"), t("verificationEmailSent"));
    } catch {
      Alert.alert(t("error"), t("firebaseAuthErrorGeneric"));
    } finally {
      setResendingVerification(false);
    }
  };

  const onSignIn = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      Alert.alert(t("missingFields"), t("signInValidation"));
      return;
    }

    setLoading(true);
    try {
      const cred = await withOfflineTimeout(
        signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password),
        15000,
      );
      await withOfflineTimeout(cred.user.reload(), 10000);

      if (!cred.user.emailVerified) {
        Alert.alert(t("verifyEmailTitle"), t("pleaseVerifyEmailBeforeLogin"), [
          {
            text: resendingVerification ? t("loading") : t("resendVerificationEmail"),
            onPress: () => void resendVerificationEmail(),
          },
          { text: t("cancel") },
        ]);
        return;
      }

      const idToken = await withOfflineTimeout(cred.user.getIdToken(true), 10000);
      try {
        const res = await withOfflineTimeout(
          firebaseLogin(idToken, cred.user.displayName),
          15000,
        );
        await signIn(res.access_token);
      } catch (e) {
        if (isOfflineLikeError(e)) {
          Alert.alert(t("signInFailed"), t("featureRequiresConnection"));
          return;
        }
        if (e instanceof ApiError) {
          if (__DEV__) {
            console.log("[firebase-login] backend error status=", e.status, "message=", e.message);
          }
          if (e.status === 404) {
            Alert.alert(t("signInFailed"), t("backendAccountSyncProblem"));
            return;
          }
          Alert.alert(t("signInFailed"), e.message || t("firebaseAuthErrorGeneric"));
          return;
        }
        Alert.alert(t("signInFailed"), t("firebaseAuthErrorGeneric"));
      }
    } catch (e: any) {
      if (isOfflineLikeError(e)) {
        Alert.alert(t("signInFailed"), t("featureRequiresConnection"));
        return;
      }
      const code = String(e?.code || "");
      if (__DEV__) {
        console.log("[firebase-login] firebase error code=", code);
      }
      Alert.alert(t("signInFailed"), mapFirebaseError(code));
    } finally {
      setLoading(false);
    }
  };

  return <SafeAreaView style={styles.safe} edges={["top", "bottom"]}><DecorBlobs variant="welcome" /><KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === "ios" ? "padding" : "height"}><TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}><View style={styles.inner}><Text style={styles.welcome}>{t("welcome")}</Text><PillInput label={t("email")} icon={<Ionicons name="person-outline" size={20} color={colors.text} />} placeholder={t("enterEmail")} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} /><PillInput label={t("password")} icon={<Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />} placeholder="••••••••" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} rightAccessory={<Pressable onPress={() => setShowPassword((v) => !v)} accessibilityLabel={showPassword ? t("hidePassword") : t("showPassword")}><Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} /></Pressable>} /><Pressable style={styles.forgotWrap} onPress={() => navigation.navigate("ForgotPassword")}><Text style={styles.forgot}>{t("forgotPassword")}</Text></Pressable><Pressable style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={onSignIn} disabled={loading}>{loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>{t("signIn")}</Text>}</Pressable><View style={styles.separatorRow}><View style={styles.sepLine} /><Text style={styles.sepOr}>{t("or")}</Text><View style={styles.sepLine} /></View><Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("Register")}><Text style={styles.primaryBtnText}>{t("createAccount")}</Text></Pressable></View></ScrollView></TouchableWithoutFeedback></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, kav: { flex: 1 }, scrollContent: { flexGrow: 1, paddingBottom: 32 }, inner: { paddingHorizontal: 28, paddingTop: 8 }, welcome: { fontSize: 32, fontWeight: "700", textAlign: "center", color: colors.text, marginBottom: 12 }, forgotWrap: { alignSelf: "flex-end", marginBottom: 20, marginTop: -6 }, forgot: { fontSize: 13, color: colors.textMuted }, primaryBtn: { backgroundColor: colors.coralButton, borderRadius: 999, paddingVertical: 16, alignItems: "center" }, btnDisabled: { opacity: 0.7 }, primaryBtnText: { color: colors.white, fontSize: 17, fontWeight: "700" }, separatorRow: { flexDirection: "row", alignItems: "center", marginVertical: 16 }, sepLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" }, sepOr: { marginHorizontal: 12, fontSize: 14, color: colors.textMuted } });
