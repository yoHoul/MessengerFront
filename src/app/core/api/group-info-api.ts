import { Observable } from 'rxjs';

import { User } from '../type/user';

export abstract class GroupInfoApi {
  abstract getMembers(chatId: string): Observable<User[]>;
  abstract createGroup(
    chatId: string,
    ownerId: string,
    memberIds: string[],
  ): Observable<void>;
  abstract addMembers(chatId: string, memberIds: string[]): Observable<void>;
  abstract removeMember(chatId: string, userId: string): Observable<void>;
  abstract deleteGroup(chatId: string): Observable<void>;
}
