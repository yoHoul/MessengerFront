import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, shareReplay } from 'rxjs';

import { User } from '../type/user';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly http = inject(HttpClient);

  private readonly userRequest = this.http
    .get<User>('assets/mocks/user.json')
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  private readonly user = toSignal(this.userRequest, { initialValue: null });

  readonly currentUser = this.user;
  readonly currentUserId = computed(() => this.user()?.id ?? null);

  getCurrentUser(): Observable<User> {
    return this.userRequest;
  }
}
