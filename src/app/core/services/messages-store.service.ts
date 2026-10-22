import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap, throwError } from 'rxjs';

import { Message } from '../type/message';
import { ChatMessagesState } from '../type/message-page';
import { MessagesApiService } from './messages-api.service';

const PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class MessagesStoreService {
  private readonly messagesApi = inject(MessagesApiService);

  private readonly states = signal<ReadonlyMap<string, ChatMessagesState>>(
    new Map(),
  );

  readonly stateMap = this.states.asReadonly();

  getState(chatId: string): ChatMessagesState | null {
    const state = this.states().get(chatId);
    return state ? this.snapshot(state) : null;
  }

  getInitialPage(chatId: string): Observable<ChatMessagesState> {
    const cached = this.states().get(chatId);

    if (cached) {
      return of(this.snapshot(cached));
    }

    return this.messagesApi.getMessages(chatId, { limit: PAGE_SIZE }).pipe(
      map((page) => {
        const state: ChatMessagesState = {
          ...page,
          loadingOlder: false,
        };

        this.commit(chatId, state);
        return this.snapshot(state);
      }),
    );
  }

  loadOlder(chatId: string): Observable<ChatMessagesState | null> {
    const current = this.states().get(chatId);

    if (!current || !current.hasMoreBefore || current.loadingOlder) {
      return of(null);
    }

    this.commit(chatId, { ...current, loadingOlder: true });

    return this.messagesApi
      .getMessages(chatId, {
        before: current.nextBefore,
        limit: PAGE_SIZE,
      })
      .pipe(
        map((page) => {
          const latest = this.states().get(chatId) ?? current;
          const loadedIds = new Set(
            latest.messages.map((message) => message.id),
          );
          const older = page.messages.filter(
            (message) => !loadedIds.has(message.id),
          );

          const state: ChatMessagesState = {
            ...latest,
            messages: [...older, ...latest.messages],
            hasMoreBefore: page.hasMoreBefore,
            nextBefore: page.nextBefore,
            loadingOlder: false,
          };

          this.commit(chatId, state);
          return this.snapshot(state);
        }),
        catchError((error) => {
          const latest = this.states().get(chatId);

          if (latest) {
            this.commit(chatId, { ...latest, loadingOlder: false });
          }

          return throwError(() => error);
        }),
        finalize(() => {
          const latest = this.states().get(chatId);

          if (latest?.loadingOlder) {
            this.commit(chatId, { ...latest, loadingOlder: false });
          }
        }),
      );
  }

  getLoadedMessages(chatId: string): Message[] {
    return [...(this.states().get(chatId)?.messages ?? [])];
  }

  getPagination(chatId: string): {
    hasMoreBefore: boolean;
    nextBefore: string | null;
  } {
    const state = this.states().get(chatId);

    return {
      hasMoreBefore: state?.hasMoreBefore ?? false,
      nextBefore: state?.nextBefore ?? null,
    };
  }

  setMessages(chatId: string, messages: Message[]): void {
    const state = this.states().get(chatId);

    this.commit(chatId, {
      messages: [...messages],
      hasMoreBefore: state?.hasMoreBefore ?? false,
      nextBefore: state?.nextBefore ?? null,
      loadingOlder: state?.loadingOlder ?? false,
    });
  }

  appendMessage(chatId: string, message: Message): Observable<void> {
    const state = this.states().get(chatId);

    if (state) {
      if (!state.messages.some((item) => item.id === message.id)) {
        this.commit(chatId, {
          ...state,
          messages: [...state.messages, message],
        });
      }

      return of(undefined);
    }

    return this.messagesApi.getMessages(chatId, { limit: PAGE_SIZE }).pipe(
      tap((page) => {
        const messages = page.messages.some((item) => item.id === message.id)
          ? [...page.messages]
          : [...page.messages, message];

        this.commit(chatId, {
          ...page,
          messages,
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
    const loadedMessage = this.states()
      .get(chatId)
      ?.messages.find((message) => message.id === messageId);

    if (loadedMessage) {
      return of(loadedMessage);
    }

    return this.messagesApi.getMessageContext(chatId, messageId).pipe(
      map((page) => {
        const state: ChatMessagesState = {
          ...page,
          loadingOlder: false,
        };

        this.commit(chatId, state);
        return state.messages.find((message) => message.id === messageId) ?? null;
      }),
    );
  }

  private commit(chatId: string, state: ChatMessagesState): void {
    this.states.update((states) => {
      const next = new Map(states);
      next.set(chatId, state);
      return next;
    });
  }

  private snapshot(state: ChatMessagesState): ChatMessagesState {
    return {
      ...state,
      messages: [...state.messages],
    };
  }
}
