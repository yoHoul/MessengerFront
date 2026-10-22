import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { User } from '../type/user';
import { CurrentUserService } from './current-user.service';
import { UserDirectoryApi } from '../api/user-directory-api';

@Injectable({ providedIn: 'root' })
export class SearchUsersApiService {
  private readonly currentUser = inject(CurrentUserService);
  private readonly userProfileApi = inject(UserDirectoryApi);

  searchUsers(query: string, tagOnly = false): Observable<User[]> {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return of([]);
    }

    const currentUserId = this.currentUser.currentUserId();

    return this.userProfileApi.searchUsers(query, tagOnly).pipe(
      map((users) => users.filter((user) => user.id !== currentUserId)),
    );
  }
}
