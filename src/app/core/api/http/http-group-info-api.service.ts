import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { GroupInfoApi } from '../group-info-api';
import { API_CONFIG } from '../api-config';
import { User } from '../../type/user';

@Injectable({ providedIn: 'root' })
export class HttpGroupInfoApiService implements GroupInfoApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  getMembers(chatId: string): Observable<User[]> {
    return this.http.get<User[]>(this.url(`/chats/${chatId}/members`));
  }

  createGroup(
    _chatId: string,
    _ownerId: string,
    _memberIds: string[],
  ): Observable<void> {
    // Группа и участники создаются в POST /chats/groups.
    return of(undefined);
  }

  addMembers(chatId: string, memberIds: string[]): Observable<void> {
    return this.http.post<void>(this.url(`/chats/${chatId}/members`), {
      memberIds,
    });
  }

  removeMember(chatId: string, userId: string): Observable<void> {
    return this.http.delete<void>(
      this.url(`/chats/${chatId}/members/${userId}`),
    );
  }

  deleteGroup(_chatId: string): Observable<void> {
    // Удаление выполняет DELETE /chats/:chatId в ChatsApi.
    return of(undefined);
  }

  private url(path: string): string {
    return `${this.config.baseUrl.replace(/\/$/, '')}${path}`;
  }
}
