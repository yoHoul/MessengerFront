import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { MessagesApi } from '../messages-api';
import { API_CONFIG } from '../api-config';
import { Message } from '../../type/message';
import { MessagePage } from '../../type/message-page';
import { SendMessageInput } from '../../type/send-message-input';

const PAGE_SIZE = 20;
const CONTEXT_RADIUS = 10;

@Injectable({ providedIn: 'root' })
export class HttpMessagesApiService implements MessagesApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  getMessages(
    chatId: string,
    options: { before?: string | null; after?: string | null; limit?: number } = {},
  ): Observable<MessagePage> {
    let params = new HttpParams().set(
      'limit',
      String(options.limit ?? PAGE_SIZE),
    );

    if (options.before) {
      params = params.set('before', options.before);
    }

    if (options.after) {
      params = params.set('after', options.after);
    }

    return this.http.get<MessagePage>(
      this.url(`/chats/${chatId}/messages`),
      { params },
    );
  }

  getMessageContext(
    chatId: string,
    messageId: string,
  ): Observable<MessagePage> {
    return this.http.get<MessagePage>(
      this.url(`/chats/${chatId}/messages/context`),
      {
        params: new HttpParams()
          .set('messageId', messageId)
          .set('radius', String(CONTEXT_RADIUS)),
      },
    );
  }

  searchMessages(chatId: string, query: string): Observable<Message[]> {
    return this.http.get<Message[]>(
      this.url(`/chats/${chatId}/messages/search`),
      { params: new HttpParams().set('q', query) },
    );
  }

  sendMessage(
    chatId: string,
    input: SendMessageInput,
  ): Observable<Message> {
    return this.http.post<Message>(this.url(`/chats/${chatId}/messages`), {
      text: input.text,
      replyToId: input.replyToId ?? null,
      attachmentIds: (input.attachments ?? []).map(
        (attachment) => attachment.id,
      ),
    });
  }

  editMessage(
    _chatId: string,
    messageId: string,
    text: string,
  ): Observable<Message | null> {
    return this.http.patch<Message>(this.url(`/messages/${messageId}`), {
      text,
    });
  }

  deleteMessage(_chatId: string, messageId: string): Observable<boolean> {
    return this.http
      .delete<void>(this.url(`/messages/${messageId}`))
      .pipe(map(() => true));
  }

  forwardMessage(
    _sourceChatId: string,
    messageId: string,
    targetChatId: string,
  ): Observable<Message | null> {
    return this.http.post<Message>(
      this.url(`/messages/${messageId}/forward`),
      { targetChatId },
    );
  }

  private url(path: string): string {
    return `${this.config.baseUrl.replace(/\/$/, '')}${path}`;
  }
}
