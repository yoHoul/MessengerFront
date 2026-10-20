import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';

import { Message } from '../type/message';

@Injectable({ providedIn: 'root' })
export class MessagesApiService {
  private readonly http = inject(HttpClient);

  getMessages(chatId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`assets/mocks/messages/${chatId}.json`).pipe(
      catchError((error: HttpErrorResponse) =>
        error.status === 404 ? of<Message[]>([]) : throwError(() => error),
      ),
    );
  }
}
