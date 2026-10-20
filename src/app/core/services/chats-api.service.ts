import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';

import { ChatListItem } from '../type/chat-list-item';
import { CurrentUserService } from './current-user.service';

@Injectable({ providedIn: 'root' })
export class ChatsApiService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = inject(CurrentUserService);

  getChats(): Observable<ChatListItem[]> {
    const userId = this.currentUser.currentUserId();

    if (!userId) {
      return of([]);
    }

    return this.http
      .get<ChatListItem[]>(`assets/mocks/chat-list/${userId}.json`)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          error.status === 404 ? of([]) : throwError(() => error),
        ),
      );
  }
}
