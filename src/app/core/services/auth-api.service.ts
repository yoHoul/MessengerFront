import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthCredentials, AuthSession, ProfileUpdate } from '../type/auth';
import { User } from '../type/user';
import { AuthApi } from '../api/auth-api';
import { API_CONFIG } from '../api/api-config';

@Injectable({ providedIn: 'root' })
export class AuthApiService implements AuthApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  login(credentials: AuthCredentials): Observable<AuthSession> {
    return this.http.post<AuthSession>(this.url('/auth/login'), credentials);
  }

  register(credentials: AuthCredentials): Observable<AuthSession> {
    return this.http.post<AuthSession>(this.url('/auth/register'), credentials);
  }

  me(token: string): Observable<User> {
    return this.http.get<User>(this.url('/auth/me'), {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  updateProfile(token: string, profile: ProfileUpdate): Observable<User> {
    return this.http.patch<User>(this.url('/auth/profile'), profile, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  changePassword(
    token: string,
    oldPassword: string,
    newPassword: string,
  ): Observable<void> {
    return this.http.post<void>(
      this.url('/auth/change-password'),
      { oldPassword, newPassword },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  logout(token: string): Observable<void> {
    return this.http.post<void>(this.url('/auth/logout'), null, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  private url(path: string): string {
    return `${this.config.baseUrl.replace(/\/$/, '')}${path}`;
  }
}
