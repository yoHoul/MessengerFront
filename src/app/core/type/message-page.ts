import { Message } from './message';

export interface MessagePage {
  messages: Message[];
  hasMoreBefore: boolean;
  nextBefore: string | null;
  hasMoreAfter: boolean;
  nextAfter: string | null;
}

export interface ChatMessagesState extends MessagePage {
  loadingOlder: boolean;
  loadingNewer: boolean;
}
