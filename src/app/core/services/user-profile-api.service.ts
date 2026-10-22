import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, forkJoin, map, shareReplay, take } from 'rxjs';

import { User } from '../type/user';

@Injectable({ providedIn: 'root' })
export class UserProfileApiService {
  private readonly http = inject(HttpClient);

  private readonly extraUsers = new BehaviorSubject<User[]>([]);

  private readonly usersRequest = forkJoin({
    users: this.http.get<User[]>('assets/mocks/users.json'),
    searchUsers: this.http.get<User[]>('assets/mocks/search-users.json'),
  }).pipe(
    map(({ users, searchUsers }) => [...users, ...searchUsers]),
    shareReplay(1),
  );

  getProfile(userId: string): Observable<User | null> {
    return this.getUsersOnce().pipe(
      map((users) => users.find((user) => user.id === userId) ?? null),
    );
  }

  watchUsers(): Observable<User[]> {
    return combineLatest([this.usersRequest, this.extraUsers]).pipe(
      map(([users, extraUsers]) => {
        const merged = new Map(users.map((user) => [user.id, user]));

        for (const user of extraUsers) {
          merged.set(user.id, user);
        }

        return [...merged.values()];
      }),
    );
  }

  getUsersOnce(): Observable<User[]> {
    return this.watchUsers().pipe(take(1));
  }

  upsertUser(user: User): void {
    const users = this.extraUsers.value;
    const index = users.findIndex((item) => item.id === user.id);

    if (index < 0) {
      this.extraUsers.next([...users, user]);
      return;
    }

    this.extraUsers.next(
      users.map((item) => (item.id === user.id ? user : item)),
    );
  }
}
