import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, shareReplay } from 'rxjs';

import { User } from '../type/user';

@Injectable({ providedIn: 'root' })
export class UserProfileApiService {
  private readonly http = inject(HttpClient);

  private readonly usersRequest = forkJoin({
    users: this.http.get<User[]>('assets/mocks/users.json'),
    searchUsers: this.http.get<User[]>('assets/mocks/search-users.json'),
  }).pipe(
    map(({ users, searchUsers }) => [...users, ...searchUsers]),
    shareReplay(1),
  );

  getProfile(userId: string): Observable<User | null> {
    return this.usersRequest.pipe(
      map((users) => users.find((user) => user.id === userId) ?? null),
    );
  }

  getUsers(): Observable<User[]> {
    return this.usersRequest;
  }
}
