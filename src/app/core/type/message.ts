export interface Message {
  id: string;
  chatId: string;
  authorId: string;
  text: string;
  createdAt: string;
  replyToId?: string | null;
  editedAt?: string | null;
}
