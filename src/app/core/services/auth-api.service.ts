import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthCredentials, AuthSession, ProfileUpdate } from '../type/auth';
import { User } from '../type/user';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(credentials: AuthCredentials): Observable<AuthSession> {
    return this.http.post<AuthSession>('/api/auth/login', credentials);
  }

  register(credentials: AuthCredentials): Observable<AuthSession> {
    return this.http.post<AuthSession>('/api/auth/register', credentials);
  }

  me(token: string): Observable<User> {
    return this.http.get<User>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  updateProfile(token: string, profile: ProfileUpdate): Observable<User> {
    return this.http.patch<User>('/api/auth/profile', profile, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  changePassword(
    token: string,
    oldPassword: string,
    newPassword: string,
  ): Observable<void> {
    return this.http.post<void>(
      '/api/auth/change-password',
      { oldPassword, newPassword },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  logout(token: string): Observable<void> {
    return this.http.post<void>('/api/auth/logout', null, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
