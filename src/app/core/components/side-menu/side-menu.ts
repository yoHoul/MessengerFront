import { Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DrawerModule } from '@openng/optimus-ui/drawer';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';

import { CurrentUserService } from '../../services/current-user.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  imports: [AvatarModule, ButtonModule, DrawerModule, FormsModule, ToggleSwitchModule],
  selector: 'app-side-menu',
  styleUrl: './side-menu.scss',
  templateUrl: './side-menu.html',
})
export class SideMenu {
  private readonly currentUser = inject(CurrentUserService);

  protected readonly theme = inject(ThemeService);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  readonly profileRequested = output<void>();
  readonly logoutRequested = output<void>();

  protected readonly user = this.currentUser.currentUser;

  protected readonly initials = computed(() => {
    const displayName = this.user()?.displayName ?? '';

    return (
      displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || '?'
    );
  });
}
