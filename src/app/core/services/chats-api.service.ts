import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

import { ChatListItem } from '../type/chat-list-item';
import { User } from '../type/user';

@Injectable({ providedIn: 'root' })
export class ChatsApiService {
  private readonly http = inject(HttpClient);

  getChats(): Observable<ChatListItem[]> {
    return this.http.get<User>('assets/mocks/user.json').pipe(
      switchMap((user) =>
        this.http.get<ChatListItem[]>(`assets/mocks/chat-list/${user.id}.json`),
      ),
    );
  }
}
