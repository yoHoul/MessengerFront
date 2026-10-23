import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { UserDirectoryApi } from '../user-directory-api';
import { API_CONFIG } from '../api-config';
import { User } from '../../type/user';

@Injectable({ providedIn: 'root' })
export class HttpUserDirectoryApiService implements UserDirectoryApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private readonly usersRequest = this.http
    .get<User[]>(this.url('/users'))
    .pipe(shareReplay(1));

  watchUsers(): Observable<User[]> {
    return this.usersRequest;
  }

  getUsersOnce(): Observable<User[]> {
    return this.usersRequest;
  }

  getProfile(userId: string): Observable<User | null> {
    return this.http.get<User | null>(this.url(`/users/${userId}`));
  }

  searchUsers(query: string, tagOnly: boolean): Observable<User[]> {
    return this.http.get<User[]>(this.url('/users/search'), {
      params: {
        q: query,
        tagOnly: String(tagOnly),
      },
    });
  }

  upsertUser(_user: User): void {
    // Обновление профиля приходит с сервера после PATCH /auth/profile.
  }

  private url(path: string): string {
    return `${this.config.baseUrl.replace(/\/$/, '')}${path}`;
  }
}
