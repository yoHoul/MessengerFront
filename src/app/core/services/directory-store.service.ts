import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { User } from '../type/user';
import { UserProfileApiService } from './user-profile-api.service';

@Injectable({ providedIn: 'root' })
export class DirectoryStoreService {
  private readonly userProfileApi = inject(UserProfileApiService);
  private readonly usersState = signal<ReadonlyMap<string, User>>(new Map());

  readonly usersById = this.usersState.asReadonly();

  constructor() {
    this.userProfileApi
      .getUsers()
      .pipe(takeUntilDestroyed())
      .subscribe((users) =>
        this.usersState.set(
          new Map(users.map((user) => [user.id, user] as const)),
        ),
      );
  }

  getUser(userId: string): User | null {
    return this.usersState().get(userId) ?? null;
  }
}
