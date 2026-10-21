import { Message } from './message';

export interface MessageForwardRequest {
  message: Message;
  authorName: string;
}
