import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Onboarding: undefined;
  Welcome: undefined;
  Register: undefined;
  MainTabs: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Feature: { title: string };
};

export type WelcomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Welcome'>;
export type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, 'Register'>;
