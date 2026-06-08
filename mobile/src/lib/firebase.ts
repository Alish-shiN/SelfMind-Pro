import { getApp, getApps, initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, initializeAuth } from '@firebase/auth';
import type { Persistence } from '@firebase/auth';
import * as FirebaseAuth from '@firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

function getFirebaseAuth() {
  const getReactNativePersistence = (
    FirebaseAuth as typeof FirebaseAuth & {
      getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
    }
  ).getReactNativePersistence;

  if (!getReactNativePersistence) {
    return getAuth(firebaseApp);
  }

  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error: any) {
    if (error?.code === 'auth/already-initialized') {
      return getAuth(firebaseApp);
    }
    throw error;
  }
}

export const firebaseAuth = getFirebaseAuth();
