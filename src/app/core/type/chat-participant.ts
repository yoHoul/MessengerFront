export type ChatRole = 'owner' | 'member';

export interface ChatParticipant {
  chatId: string;
  userId: string;
  role: ChatRole;
  joinedAt: string;
  lastReadMessageId: string | null;
  unreadCount: number;
  muted: boolean;
  pinned: boolean;
}
