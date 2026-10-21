import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';

import appUsersData from '../../../mocks/appUsersData.json';
import { AuthCredentials, AuthSession, ProfileUpdate } from '../type/auth';
import { User } from '../type/user';

interface AppUserRecord {
  id: string;
  login: string;
  password: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

const FIRST_ACCOUNT_ID = 1000;

const accounts = appUsersData as AppUserRecord[];

function nextAccountId(): string {
  const maxId = accounts.reduce((max, account) => {
    const id = Number(account.id);
    return Number.isFinite(id) ? Math.max(max, id) : max;
  }, 0);

  return String(Math.max(maxId + 1, FIRST_ACCOUNT_ID));
}

function toUser(account: AppUserRecord): User {
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
  };
}

function tokenFor(account: AppUserRecord): string {
  return `mock-token-${account.id}`;
}

function accountForToken(token: string | null): AppUserRecord | undefined {
  if (!token?.startsWith('mock-token-')) {
    return undefined;
  }

  const id = token.slice('mock-token-'.length);
  return accounts.find((account) => account.id === id);
}

function readToken(request: HttpRequest<unknown>): string | null {
  const header = request.headers.get('Authorization');
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

function unauthorized(url: string): Observable<never> {
  return throwError(
    () => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized', url }),
  );
}

function badRequest(url: string): Observable<never> {
  return throwError(
    () => new HttpErrorResponse({ status: 400, statusText: 'Bad Request', url }),
  );
}

function conflict(url: string): Observable<never> {
  return throwError(
    () => new HttpErrorResponse({ status: 409, statusText: 'Conflict', url }),
  );
}

export const authMockInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.method === 'POST' && request.url.endsWith('/api/auth/register')) {
    const credentials = request.body as AuthCredentials | null;
    const login = credentials?.login?.trim();
    const password = credentials?.password;

    if (!login || !password) {
      return badRequest(request.url);
    }

    const normalizedLogin = login.toLowerCase();
    const isTaken = accounts.some(
      (account) =>
        account.login.toLowerCase() === normalizedLogin ||
        account.username.toLowerCase() === normalizedLogin,
    );

    if (isTaken) {
      return conflict(request.url);
    }

    const account: AppUserRecord = {
      id: nextAccountId(),
      login,
      password,
      username: login,
      displayName: login,
      avatarUrl: null,
    };

    accounts.push(account);

    const session: AuthSession = {
      token: tokenFor(account),
      user: toUser(account),
    };

    return of(new HttpResponse({ status: 201, body: session }));
  }

  if (request.method === 'POST' && request.url.endsWith('/api/auth/login')) {
    const credentials = request.body as AuthCredentials | null;
    const login = credentials?.login?.trim().toLowerCase();
    const account = login
      ? accounts.find(
          (item) =>
            item.login.toLowerCase() === login &&
            item.password === credentials?.password,
        )
      : undefined;

    if (!account) {
      return unauthorized(request.url);
    }

    const session: AuthSession = {
      token: tokenFor(account),
      user: toUser(account),
    };

    return of(new HttpResponse({ status: 200, body: session }));
  }

  if (request.method === 'GET' && request.url.endsWith('/api/auth/me')) {
    const account = accountForToken(readToken(request));

    if (!account) {
      return unauthorized(request.url);
    }

    return of(new HttpResponse({ status: 200, body: toUser(account) }));
  }

  if (request.method === 'PATCH' && request.url.endsWith('/api/auth/profile')) {
    const account = accountForToken(readToken(request));

    if (!account) {
      return unauthorized(request.url);
    }

    const profile = request.body as ProfileUpdate | null;
    const displayName = profile?.displayName?.trim();
    const username = profile?.username?.trim();

    if (!displayName || !username) {
      return badRequest(request.url);
    }

    const normalizedUsername = username.toLowerCase();
    const isUsernameTaken = accounts.some(
      (item) =>
        item.id !== account.id &&
        item.username.toLowerCase() === normalizedUsername,
    );

    if (isUsernameTaken) {
      return conflict(request.url);
    }

    account.displayName = displayName;
    account.username = username;

    return of(new HttpResponse({ status: 200, body: toUser(account) }));
  }

  if (
    request.method === 'POST' &&
    request.url.endsWith('/api/auth/change-password')
  ) {
    const account = accountForToken(readToken(request));

    if (!account) {
      return unauthorized(request.url);
    }

    const passwords = request.body as {
      oldPassword?: string;
      newPassword?: string;
    } | null;

    if (
      !passwords?.oldPassword ||
      !passwords.newPassword ||
      account.password !== passwords.oldPassword
    ) {
      return badRequest(request.url);
    }

    account.password = passwords.newPassword;

    return of(new HttpResponse({ status: 200, body: null }));
  }

  if (request.method === 'POST' && request.url.endsWith('/api/auth/logout')) {
    return of(new HttpResponse({ status: 200, body: null }));
  }

  return next(request);
};
