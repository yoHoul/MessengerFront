import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';

import { ChatListItem } from '../type/chat-list-item';
import { User } from '../type/user';
import { CurrentUserService } from './current-user.service';
import { MockIdService } from './mock-id.service';

const CHAT_LIST_MOCK_VERSION = '2';

@Injectable({ providedIn: 'root' })
export class ChatsApiService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = inject(CurrentUserService);
  private readonly ids = inject(MockIdService);

  getChats(): Observable<ChatListItem[]> {
    const userId = this.currentUser.currentUserId();

    if (!userId) {
      return of([]);
    }

    return this.http
      .get<ChatListItem[]>(
        `assets/mocks/chat-list/${userId}.json?v=${CHAT_LIST_MOCK_VERSION}`,
      )
      .pipe(
        catchError((error: HttpErrorResponse) =>
          error.status === 404 ? of([]) : throwError(() => error),
        ),
      );
  }

  createDirectChat(user: User): Observable<ChatListItem> {
    return of(this.createChat(user.displayName, null, user.id));
  }

  createGroupChat(title: string, ownerId: string): Observable<ChatListItem> {
    return of(this.createChat(title, ownerId, null));
  }

  renameChat(_chatId: string, _title: string): Observable<void> {
    return of(undefined);
  }

  deleteChat(_chatId: string): Observable<void> {
    return of(undefined);
  }

  private createChat(
    title: string,
    ownerId: string | null,
    peerUserId: string | null,
  ): ChatListItem {
    return {
      id: this.ids.next(),
      title,
      lastMessage: 'Нет сообщений',
      lastMessageAt: null,
      lastMessageAuthorId: null,
      lastMessageAuthorName: null,
      unreadCount: 0,
      peerUserId,
      ownerId,
    };
  }
}
