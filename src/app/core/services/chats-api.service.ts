import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class ChatsApiService {
  private readonly http = inject(HttpClient);

  getChats(): Observable<Chat[]> {
    return this.http.get<Chat[]>('assets/mocks/chats.json');
  }
}
