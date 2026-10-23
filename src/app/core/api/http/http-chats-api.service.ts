import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ChatsApi } from '../chats-api';
import { API_CONFIG } from '../api-config';
import { ChatListItem } from '../../type/chat-list-item';
import { User } from '../../type/user';

@Injectable({ providedIn: 'root' })
export class HttpChatsApiService implements ChatsApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  getChats(): Observable<ChatListItem[]> {
    return this.http.get<ChatListItem[]>(this.url('/chats'));
  }

  createDirectChat(user: User): Observable<ChatListItem> {
    return this.http.post<ChatListItem>(this.url('/chats/direct'), {
      userId: user.id,
    });
  }

  createGroupChat(
    title: string,
    ownerId: string,
    memberIds: string[],
  ): Observable<ChatListItem> {
    return this.http.post<ChatListItem>(this.url('/chats/groups'), {
      title,
      ownerId,
      memberIds,
    });
  }

  renameChat(chatId: string, title: string): Observable<void> {
    return this.http.patch<void>(this.url(`/chats/${chatId}`), { title });
  }

  deleteChat(chatId: string): Observable<void> {
    return this.http.delete<void>(this.url(`/chats/${chatId}`));
  }

  private url(path: string): string {
    return `${this.config.baseUrl.replace(/\/$/, '')}${path}`;
  }
}
