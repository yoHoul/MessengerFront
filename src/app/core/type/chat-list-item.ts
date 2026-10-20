export interface ChatListItem {
  id: string;
  title: string;
  lastMessage: string;
  unreadCount: number;
  peerUserId: string | null;
}
