import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap, throwError } from 'rxjs';

import { Message } from '../type/message';
import { ChatMessagesState } from '../type/message-page';
import { MessagesApiService } from './messages-api.service';

const PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class MessagesStoreService {
  private readonly messagesApi = inject(MessagesApiService);

  private readonly states = new Map<string, ChatMessagesState>();

  getInitialPage(chatId: string): Observable<ChatMessagesState> {
    const cached = this.states.get(chatId);

    if (cached) {
      return of(this.snapshot(cached));
    }

    return this.messagesApi.getMessages(chatId, { limit: PAGE_SIZE }).pipe(
      tap((page) => {
        this.states.set(chatId, {
          ...page,
          loadingOlder: false,
        });
      }),
      map((page) => ({
        ...page,
        loadingOlder: false,
      })),
    );
  }

  loadOlder(chatId: string): Observable<ChatMessagesState | null> {
    const state = this.states.get(chatId);

    if (!state || !state.hasMoreBefore || state.loadingOlder) {
      return of(null);
    }

    state.loadingOlder = true;

    return this.messagesApi
      .getMessages(chatId, {
        before: state.nextBefore,
        limit: PAGE_SIZE,
      })
      .pipe(
        map((page) => {
          const loadedIds = new Set(state.messages.map((message) => message.id));
          const older = page.messages.filter(
            (message) => !loadedIds.has(message.id),
          );

          state.messages = [...older, ...state.messages];
          state.hasMoreBefore = page.hasMoreBefore;
          state.nextBefore = page.nextBefore;
          state.loadingOlder = false;

          return this.snapshot(state);
        }),
        catchError((error) => {
          state.loadingOlder = false;
          return throwError(() => error);
        }),
        finalize(() => {
          state.loadingOlder = false;
        }),
      );
  }

  getLoadedMessages(chatId: string): Message[] {
    return [...(this.states.get(chatId)?.messages ?? [])];
  }

  getPagination(chatId: string): {
    hasMoreBefore: boolean;
    nextBefore: string | null;
  } {
    const state = this.states.get(chatId);

    return {
      hasMoreBefore: state?.hasMoreBefore ?? false,
      nextBefore: state?.nextBefore ?? null,
    };
  }

  setMessages(chatId: string, messages: Message[]): void {
    const state = this.states.get(chatId);

    if (state) {
      state.messages = [...messages];
      return;
    }

    this.states.set(chatId, {
      messages: [...messages],
      hasMoreBefore: false,
      nextBefore: null,
      loadingOlder: false,
    });
  }

  appendMessage(chatId: string, message: Message): Observable<void> {
    const state = this.states.get(chatId);

    if (state) {
      state.messages = [...state.messages, message];
      return of(undefined);
    }

    return this.messagesApi.getMessages(chatId, { limit: PAGE_SIZE }).pipe(
      tap((page) => {
        this.states.set(chatId, {
          ...page,
          messages: [...page.messages, message],
          loadingOlder: false,
        });
      }),
      map(() => undefined),
    );
  }

  ensureMessageLoaded(
    chatId: string,
    messageId: string,
  ): Observable<Message | null> {
    const loadedMessage = this.states
      .get(chatId)
      ?.messages.find((message) => message.id === messageId);

    if (loadedMessage) {
      return of(loadedMessage);
    }

    return this.messagesApi.getMessageContext(chatId, messageId).pipe(
      tap((page) => {
        this.states.set(chatId, {
          ...page,
          loadingOlder: false,
        });
      }),
      map((page) => page.messages.find((message) => message.id === messageId) ?? null),
    );
  }

  private snapshot(state: ChatMessagesState): ChatMessagesState {
    return {
      ...state,
      messages: [...state.messages],
    };
  }
}
