import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import { Message } from '../type/message';
import { MessagePage } from '../type/message-page';

const PAGE_SIZE = 20;
const CONTEXT_RADIUS = 10;

@Injectable({ providedIn: 'root' })
export class MessagesApiService {
  private readonly http = inject(HttpClient);

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
        const end = messages.length;
        const page = messages.slice(start, end);

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

  private getAll(chatId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`assets/mocks/messages/${chatId}.json`).pipe(
      map((messages) =>
        [...messages].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        ),
      ),
      catchError((error: HttpErrorResponse) =>
        error.status === 404 ? of<Message[]>([]) : throwError(() => error),
      ),
    );
  }
}
