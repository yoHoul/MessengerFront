import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

import { ChatListItem } from '../type/chat-list-item';
import { CurrentUserService } from './current-user.service';

@Injectable({ providedIn: 'root' })
export class ChatsApiService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = inject(CurrentUserService);

  getChats(): Observable<ChatListItem[]> {
    return this.currentUser.getCurrentUser().pipe(
      switchMap((user) =>
        this.http.get<ChatListItem[]>(`assets/mocks/chat-list/${user.id}.json`),
      ),
    );
  }
}
