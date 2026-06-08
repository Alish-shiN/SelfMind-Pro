import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { clearToken, getToken, purgeSensitiveLocalCaches, setToken } from '../lib/storage';
import { ApiError } from '../api/client';
import { getDashboardHome } from '../api/dashboard';
import { firebaseAuth } from '../lib/firebase';
import { isOfflineLikeError, withOfflineTimeout } from '../services/offlineNetworkService';

type AuthContextValue = {
  token: string | null;
  ready: boolean;
  signIn: (accessToken: string) => Promise<void>;
  signOut: (reason?: 'sessionExpired') => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function clearFirebaseSession() {
  try {
    await firebaseSignOut(firebaseAuth);
  } catch (error) {
    if (__DEV__) {
      console.log('[auth] Firebase sign-out failed', error);
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await purgeSensitiveLocalCaches();
      const t = await getToken();
      if (!cancelled) {
        setTokenState(t);
        setReady(true);
      }

      // Validate in the background so a slow backend does not hold the splash screen.
      if (t) {
        try {
          await withOfflineTimeout(getDashboardHome());
        } catch (e) {
          if (isOfflineLikeError(e)) {
            // Keep session when network is unavailable/slow.
          } else
          if (
            e instanceof ApiError &&
            (e.status === 401 || e.status === 403)
          ) {
            await clearToken();
            await clearFirebaseSession();
            if (!cancelled) setTokenState(null);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (accessToken: string) => {
    await setToken(accessToken);
    setTokenState(accessToken);
  }, []);

  const signOut = useCallback(async (reason?: 'sessionExpired') => {
    await clearToken();
    await clearFirebaseSession();
    setTokenState(null);
    if (reason === 'sessionExpired') {
      Alert.alert('Session expired', 'Please sign in again to continue.');
    }
  }, []);

  const value = useMemo(
    () => ({ token, ready, signIn, signOut }),
    [token, ready, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
