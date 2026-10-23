import { Observable } from 'rxjs';

import { User } from '../type/user';

export abstract class UserDirectoryApi {
  abstract watchUsers(): Observable<User[]>;
  abstract getUsersOnce(): Observable<User[]>;
  abstract getProfile(userId: string): Observable<User | null>;
  abstract searchUsers(query: string, tagOnly: boolean): Observable<User[]>;
  abstract upsertUser(user: User): void;
}
