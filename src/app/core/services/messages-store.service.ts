import { Injectable, inject } from '@angular/core';
import { Observable, map, of, tap } from 'rxjs';

import { Message } from '../type/message';
import { MessagesApiService } from './messages-api.service';

@Injectable({ providedIn: 'root' })
export class MessagesStoreService {
  private readonly messagesApi = inject(MessagesApiService);

  private readonly messagesByChat = new Map<string, Message[]>();

  getMessages(chatId: string): Observable<Message[]> {
    const cached = this.messagesByChat.get(chatId);

    if (cached) {
      return of(cached);
    }

    return this.messagesApi.getMessages(chatId).pipe(
      tap((messages) => this.messagesByChat.set(chatId, messages)),
    );
  }

  getLoadedMessages(chatId: string): Message[] {
    return this.messagesByChat.get(chatId) ?? [];
  }

  setMessages(chatId: string, messages: Message[]): void {
    this.messagesByChat.set(chatId, messages);
  }

  appendMessage(chatId: string, message: Message): Observable<void> {
    const loaded = this.messagesByChat.get(chatId);

    if (loaded) {
      this.messagesByChat.set(chatId, [...loaded, message]);
      return of(undefined);
    }

    return this.messagesApi.getMessages(chatId).pipe(
      tap((messages) => this.messagesByChat.set(chatId, [...messages, message])),
      map(() => undefined),
    );
  }

  ensureMessageLoaded(
    chatId: string,
    messageId: string,
  ): Observable<Message | null> {
    const loadedMessage = this.messagesByChat
      .get(chatId)
      ?.find((message) => message.id === messageId);

    if (loadedMessage) {
      return of(loadedMessage);
    }

    // TODO: при пагинации заменить на загрузку контекста вокруг messageId.
    return this.messagesApi.getMessages(chatId).pipe(
      tap((messages) => this.messagesByChat.set(chatId, messages)),
      map((messages) => messages.find((message) => message.id === messageId) ?? null),
    );
  }
}
