import { Observable } from 'rxjs';

import { ChatListItem } from '../type/chat-list-item';
import { User } from '../type/user';

export abstract class ChatsApi {
  abstract getChats(): Observable<ChatListItem[]>;
  abstract createDirectChat(user: User): Observable<ChatListItem>;
  abstract createGroupChat(
    title: string,
    ownerId: string,
    memberIds: string[],
  ): Observable<ChatListItem>;
  abstract renameChat(chatId: string, title: string): Observable<void>;
  abstract deleteChat(chatId: string): Observable<void>;
}
