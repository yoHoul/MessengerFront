import { Component, computed, input, output } from '@angular/core';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';

import { User } from '../../type/user';

@Component({
  imports: [AvatarModule, ButtonModule, DialogModule],
  selector: 'app-user-profile-dialog',
  styleUrl: './user-profile-dialog.scss',
  templateUrl: './user-profile-dialog.html',
})
export class UserProfileDialog {
  readonly visible = input(false);
  readonly profile = input<User | null>(null);
  readonly fallbackName = input('');
  readonly currentUserId = input<string | null>(null);

  readonly visibleChange = output<boolean>();
  readonly directChat = output<User>();

  protected readonly isCurrentUser = computed(
    () => this.profile()?.id === this.currentUserId(),
  );

  protected readonly name = computed(() => {
    const profile = this.profile();

    if (!profile) {
      return this.fallbackName();
    }

    return `${profile.displayName}${this.isCurrentUser() ? ' (Вы)' : ''}`;
  });

  protected readonly initials = computed(() =>
    this.getInitials(this.name()),
  );

  private getInitials(value: string): string {
    return (
      value
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || '?'
    );
  }
}
