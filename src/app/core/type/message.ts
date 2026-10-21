export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  isImage: boolean;
}

export interface MessageReply {
  messageId: string;
  authorId: string;
  authorName: string;
  text: string;
}

export interface ForwardedFrom {
  authorId: string;
  authorName: string;
}

export interface Message {
  id: string;
  chatId: string;
  authorId: string;
  text: string;
  createdAt: string;
  replyToId?: string | null;
  replyTo?: MessageReply | null;
  forwardedFrom?: ForwardedFrom | null;
  editedAt?: string | null;
  attachments?: MessageAttachment[];
}
