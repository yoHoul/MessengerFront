import { MessageAttachment } from './message';

export interface SendMessageInput {
  text: string;
  replyToId?: string | null;
  attachments?: MessageAttachment[];
}
