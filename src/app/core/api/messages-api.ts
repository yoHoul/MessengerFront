import { Observable } from 'rxjs';

import { Message } from '../type/message';
import { MessagePage } from '../type/message-page';
import { SendMessageInput } from '../type/send-message-input';

export abstract class MessagesApi {
  abstract getMessages(
    chatId: string,
    options?: { before?: string | null; after?: string | null; limit?: number },
  ): Observable<MessagePage>;
  abstract getMessageContext(
    chatId: string,
    messageId: string,
  ): Observable<MessagePage>;
  abstract searchMessages(chatId: string, query: string): Observable<Message[]>;
  abstract sendMessage(
    chatId: string,
    input: SendMessageInput,
  ): Observable<Message>;
  abstract editMessage(
    chatId: string,
    messageId: string,
    text: string,
  ): Observable<Message | null>;
  abstract deleteMessage(chatId: string, messageId: string): Observable<boolean>;
  abstract forwardMessage(
    sourceChatId: string,
    messageId: string,
    targetChatId: string,
  ): Observable<Message | null>;
}
