import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { signOut } = useAuth();

  const onSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  }, [signOut]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>U</Text>
        </View>
        <Text style={styles.name}>User</Text>
        <Text style={styles.sub}>This screen is a UI placeholder.</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={onSignOut}>
          <Text style={styles.actionText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundSoft },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },

  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.periwinkle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: colors.text },
  name: { marginTop: 12, fontSize: 18, fontWeight: '800', color: colors.text },
  sub: { marginTop: 6, fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  actions: { paddingHorizontal: 16, marginTop: 20 },
  actionBtn: {
    backgroundColor: colors.coral,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionText: { color: colors.white, fontWeight: '800' },
});

