export type ChatType = 'direct' | 'group';

export interface Chat {
  id: string;
  type: ChatType;
  title: string | null;
  lastMessage: string;
  createdAt: string;
}
