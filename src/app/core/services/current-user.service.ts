import { Injectable, computed, inject } from '@angular/core';

import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly auth = inject(AuthService);

  readonly currentUser = this.auth.currentUser;
  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);
}
