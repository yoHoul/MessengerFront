export interface ChatListItem {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageAt?: string | null;
  lastMessageAuthorId?: string | null;
  lastMessageAuthorName?: string | null;
  unreadCount: number;
  peerUserId: string | null;
  ownerId?: string | null;
}
