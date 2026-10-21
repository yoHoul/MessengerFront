import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { User } from '../type/user';
import { CurrentUserService } from './current-user.service';
import { UserProfileApiService } from './user-profile-api.service';

@Injectable({ providedIn: 'root' })
export class SearchUsersApiService {
  private readonly currentUser = inject(CurrentUserService);
  private readonly userProfileApi = inject(UserProfileApiService);

  searchUsers(query: string, tagOnly = false): Observable<User[]> {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return of([]);
    }

    const currentUserId = this.currentUser.currentUserId();

    return this.userProfileApi.getUsers().pipe(
      map((users) =>
        users.filter(
          (user) =>
            user.id !== currentUserId &&
            (tagOnly
              ? user.username.toLocaleLowerCase().includes(normalizedQuery)
              : user.displayName
                  .toLocaleLowerCase()
                  .includes(normalizedQuery) ||
                user.username.toLocaleLowerCase().includes(normalizedQuery)),
        ),
      ),
    );
  }
}
