import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, map, tap, throwError } from 'rxjs';

import { AuthApi } from '../api/auth-api';
import { AuthCredentials, AuthSession, ProfileUpdate } from '../type/auth';
import { User } from '../type/user';

const SESSION_STORAGE_KEY = 'messenger.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApi = inject(AuthApi);
  private readonly currentUserState = signal<User | null>(null);

  private token: string | null = null;

  readonly currentUser = this.currentUserState.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserState() !== null);

  login(credentials: AuthCredentials): Observable<User> {
    return this.authenticate(this.authApi.login(credentials));
  }

  register(credentials: AuthCredentials): Observable<User> {
    return this.authenticate(this.authApi.register(credentials));
  }

  restoreSession(): Promise<void> {
    const storedSession = this.readSession();

    if (!storedSession) {
      return Promise.resolve();
    }

    this.token = storedSession.token;

    return firstValueFrom(this.authApi.me(storedSession.token))
      .then((user) => {
        this.currentUserState.set(user);
        this.writeSession({ token: storedSession.token, user });
      })
      .catch(() => {
        this.clearSession();
      });
  }

  updateProfile(profile: ProfileUpdate): Observable<User> {
    const token = this.getToken();

    if (!token) {
      return throwError(() => new Error('Not authenticated'));
    }

    return this.authApi.updateProfile(token, profile).pipe(
      tap((user) => {
        this.currentUserState.set(user);
        this.writeSession({ token, user });
      }),
    );
  }

  changePassword(oldPassword: string, newPassword: string): Observable<void> {
    const token = this.getToken();

    if (!token) {
      return throwError(() => new Error('Not authenticated'));
    }

    return this.authApi.changePassword(token, oldPassword, newPassword);
  }

  logout(): void {
    const token = this.getToken();

    this.clearSession();

    if (token) {
      this.authApi.logout(token).subscribe({ error: () => undefined });
    }
  }

  accessToken(): string | null {
    return this.getToken();
  }

  private getToken(): string | null {
    return this.token ?? this.readSession()?.token ?? null;
  }

  private authenticate(sessionRequest: Observable<AuthSession>): Observable<User> {
    return sessionRequest.pipe(
      tap((session) => this.setSession(session)),
      map((session) => session.user),
    );
  }

  private setSession(session: AuthSession): void {
    this.token = session.token;
    this.currentUserState.set(session.user);
    this.writeSession(session);
  }

  private readSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);

      if (!raw) {
        return null;
      }

      const session = JSON.parse(raw) as Partial<AuthSession>;

      if (
        typeof session.token !== 'string' ||
        !session.user ||
        typeof session.user.id !== 'string'
      ) {
        return null;
      }

      return session as AuthSession;
    } catch {
      return null;
    }
  }

  private writeSession(session: AuthSession): void {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage may be unavailable; the in-memory session still works.
    }
  }

  private clearSession(): void {
    this.token = null;
    this.currentUserState.set(null);

    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
  }
}
