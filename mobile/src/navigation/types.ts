import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Onboarding: undefined;
  Welcome: undefined;
  Register: undefined;
  MainTabs: undefined;
  PersonalizationOnboarding: undefined;
  Profile: { openPersonalization?: boolean } | undefined;
  ArchiveSearch:
    | { initialTab?: "journals" | "insights" | "favorites" }
    | undefined;
  ProfilePersonalization: undefined;
  ProfilePrivacyCenter: undefined;
  ProfileReminders: undefined;
  ProfileAccountInfo: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  AiDiary: { entryDate?: string } | undefined;
  AiChatHistory: undefined;
  AiChat: { sessionId: number; title?: string };
  Notifications: undefined;
  DirectChat: { conversationId: number; title: string };
  AiQuiz: undefined;
  Safety: undefined;
  Feature: { title: string };
};

export type WelcomeScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Welcome"
>;
export type RegisterScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Register"
>;
