import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';

import { Message, MessageReply } from '../type/message';
import { MessagePage } from '../type/message-page';
import { SendMessageInput } from '../type/send-message-input';
import { CurrentUserService } from './current-user.service';
import { MockIdService } from './mock-id.service';
import { UserProfileApiService } from './user-profile-api.service';

const PAGE_SIZE = 20;
const CONTEXT_RADIUS = 10;

@Injectable({ providedIn: 'root' })
export class MessagesApiService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = inject(CurrentUserService);
  private readonly ids = inject(MockIdService);
  private readonly userProfileApi = inject(UserProfileApiService);

  private readonly historyByChat = new Map<string, Message[]>();

  getMessages(
    chatId: string,
    options: { before?: string | null; limit?: number } = {},
  ): Observable<MessagePage> {
    const limit = options.limit ?? PAGE_SIZE;
    const before = options.before ?? null;

    return this.getAll(chatId).pipe(
      map((messages) => {
        const end = before
          ? messages.findIndex((message) => message.id === before)
          : messages.length;

        if (end < 0) {
          return {
            messages: [],
            hasMoreBefore: false,
            nextBefore: null,
          };
        }

        const start = Math.max(0, end - limit);
        const page = messages.slice(start, end);

        return {
          messages: page,
          hasMoreBefore: start > 0,
          nextBefore: page[0]?.id ?? null,
        };
      }),
    );
  }

  getMessageContext(
    chatId: string,
    messageId: string,
  ): Observable<MessagePage> {
    return this.getAll(chatId).pipe(
      map((messages) => {
        const index = messages.findIndex((message) => message.id === messageId);

        if (index < 0) {
          return {
            messages: [],
            hasMoreBefore: false,
            nextBefore: null,
          };
        }

        const start = Math.max(0, index - CONTEXT_RADIUS);
        const page = messages.slice(start);

        return {
          messages: page,
          hasMoreBefore: start > 0,
          nextBefore: page[0]?.id ?? null,
        };
      }),
    );
  }

  searchMessages(chatId: string, query: string): Observable<Message[]> {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return of([]);
    }

    return this.getAll(chatId).pipe(
      map((messages) =>
        messages.filter((message) => {
          const attachmentNames = (message.attachments ?? [])
            .map((attachment) => attachment.name)
            .join(' ');

          return `${message.text} ${attachmentNames}`
            .toLocaleLowerCase()
            .includes(normalizedQuery);
        }),
      ),
    );
  }

  sendMessage(chatId: string, input: SendMessageInput): Observable<Message> {
    const currentUser = this.currentUser.currentUser();

    if (!currentUser) {
      return throwError(() => new Error('Not authenticated'));
    }

    return this.getAll(chatId).pipe(
      switchMap((history) => {
        const source = input.replyToId
          ? history.find((message) => message.id === input.replyToId)
          : null;

        if (input.replyToId && !source) {
          return throwError(() => new Error('Reply target not found'));
        }

        if (!source) {
          return of(this.createMessage(chatId, history, input, currentUser.id, null));
        }

        return this.resolveAuthorName(source.authorId).pipe(
          map((authorName) =>
            this.createMessage(chatId, history, input, currentUser.id, {
              messageId: source.id,
              authorId: source.authorId,
              authorName,
              text: this.messagePreview(source),
            }),
          ),
        );
      }),
    );
  }

  editMessage(
    chatId: string,
    messageId: string,
    text: string,
  ): Observable<Message | null> {
    return this.getAll(chatId).pipe(
      map((history) => {
        const message = history.find((item) => item.id === messageId);

        if (!message) {
          return null;
        }

        message.text = text;
        message.editedAt = new Date().toISOString();
        return { ...message };
      }),
    );
  }

  deleteMessage(chatId: string, messageId: string): Observable<boolean> {
    return this.getAll(chatId).pipe(
      map((history) => {
        const nextHistory = history.filter((message) => message.id !== messageId);

        if (nextHistory.length === history.length) {
          return false;
        }

        this.historyByChat.set(chatId, nextHistory);
        return true;
      }),
    );
  }

  forwardMessage(
    sourceChatId: string,
    messageId: string,
    targetChatId: string,
  ): Observable<Message | null> {
    const currentUser = this.currentUser.currentUser();

    if (!currentUser) {
      return throwError(() => new Error('Not authenticated'));
    }

    return this.getAll(sourceChatId).pipe(
      switchMap((sourceHistory) => {
        const source = sourceHistory.find((message) => message.id === messageId);

        if (!source) {
          return of(null);
        }

        return this.getAll(targetChatId).pipe(
          switchMap((targetHistory) =>
            this.resolveAuthorName(source.authorId).pipe(
              map((authorName) => {
                const message: Message = {
                  id: this.ids.next(),
                  chatId: targetChatId,
                  authorId: currentUser.id,
                  text: source.text,
                  createdAt: new Date().toISOString(),
                  attachments: source.attachments
                    ? [...source.attachments]
                    : undefined,
                  forwardedFrom: {
                    authorId: source.authorId,
                    authorName,
                  },
                };

                targetHistory.push(message);
                return message;
              }),
            ),
          ),
        );
      }),
    );
  }

  private createMessage(
    chatId: string,
    history: Message[],
    input: SendMessageInput,
    authorId: string,
    replyTo: MessageReply | null,
  ): Message {
    const message: Message = {
      id: this.ids.next(),
      chatId,
      authorId,
      text: input.text,
      createdAt: new Date().toISOString(),
      replyToId: input.replyToId ?? null,
      replyTo,
      attachments: input.attachments,
    };

    history.push(message);
    return message;
  }

  private resolveAuthorName(authorId: string): Observable<string> {
    const currentUser = this.currentUser.currentUser();

    if (currentUser?.id === authorId) {
      return of(currentUser.displayName);
    }

    return this.userProfileApi.getProfile(authorId).pipe(
      map((user) => user?.displayName ?? 'Пользователь'),
    );
  }

  private messagePreview(message: Message): string {
    return (
      message.text ||
      message.attachments?.[0]?.name ||
      (message.attachments?.length ? 'Вложение' : '')
    );
  }

  private getAll(chatId: string): Observable<Message[]> {
    const cached = this.historyByChat.get(chatId);

    if (cached) {
      return of(cached);
    }

    return this.http.get<Message[]>(`assets/mocks/messages/${chatId}.json`).pipe(
      map((messages) =>
        [...messages].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        ),
      ),
      catchError((error: HttpErrorResponse) =>
        error.status === 404 ? of<Message[]>([]) : throwError(() => error),
      ),
      tap((messages) => this.historyByChat.set(chatId, messages)),
    );
  }
}
