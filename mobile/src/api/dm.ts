import { apiFetch } from "./client";

export type DirectConversation = {
  id: number;
  other_user_id: number;
  other_username: string;
  last_message_preview?: string | null;
  created_at: string;
  updated_at: string;
};

export type DirectMessage = {
  id: number;
  conversation_id: number;
  sender_user_id: number;
  content: string;
  created_at: string;
};

export function createOrGetConversation(targetUserId: number) {
  return apiFetch<DirectConversation>(`/dm/conversations/${targetUserId}`, { method: "POST", auth: true });
}
export function listDirectConversations() {
  return apiFetch<DirectConversation[]>("/dm/conversations", { auth: true });
}
export function listDirectMessages(conversationId: number) {
  return apiFetch<DirectMessage[]>(`/dm/conversations/${conversationId}/messages`, { auth: true });
}
export function sendDirectMessage(conversationId: number, content: string) {
  return apiFetch<DirectMessage>(`/dm/conversations/${conversationId}/messages`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ content }),
  });
}
