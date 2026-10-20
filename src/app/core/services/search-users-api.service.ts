import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { User } from '../type/user';

@Injectable({ providedIn: 'root' })
export class SearchUsersApiService {
  private readonly http = inject(HttpClient);

  searchUsers(query: string): Observable<User[]> {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return this.http.get<User[]>('assets/mocks/search-users.json').pipe(
      map((users) =>
        users.filter(
          (user) =>
            user.displayName.toLocaleLowerCase().includes(normalizedQuery) ||
            user.username.toLocaleLowerCase().includes(normalizedQuery),
        ),
      ),
    );
  }
}
