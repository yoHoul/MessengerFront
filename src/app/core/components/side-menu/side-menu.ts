import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { DrawerModule } from '@openng/optimus-ui/drawer';
import { InputText } from '@openng/optimus-ui/inputtext';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';
import { catchError, of } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { CurrentUserService } from '../../services/current-user.service';
import { ThemeService } from '../../services/theme.service';
import { UserProfileApiService } from '../../services/user-profile-api.service';
import { GroupCreateRequest } from '../../type/group-create-request';
import { User } from '../../type/user';
import { AccountSettingsDialog } from '../account-settings-dialog/account-settings-dialog';
import { UserPicker } from '../user-picker/user-picker';

@Component({
  imports: [
    AccountSettingsDialog,
    AvatarModule,
    ButtonModule,
    DialogModule,
    DrawerModule,
    FormsModule,
    InputText,
    ToggleSwitchModule,
    UserPicker,
  ],
  selector: 'app-side-menu',
  styleUrl: './side-menu.scss',
  templateUrl: './side-menu.html',
})
export class SideMenu {
  private readonly auth = inject(AuthService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly userProfileApi = inject(UserProfileApiService);

  protected readonly theme = inject(ThemeService);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  readonly groupCreateRequested = output<GroupCreateRequest>();

  protected readonly user = this.currentUser.currentUser;
  protected readonly isProfileOpen = signal(false);
  protected readonly isLogoutOpen = signal(false);
  protected readonly isCreateGroupOpen = signal(false);
  protected readonly createGroupTitle = signal('');
  protected readonly createGroupUsers = signal<User[]>([]);
  protected readonly createGroupSelectedIds = signal<string[]>([]);
  protected readonly createGroupError = signal('');
  protected readonly isCreateGroupLoading = signal(false);

  protected readonly groupAvatarInitials = computed(() =>
    this.getInitials(this.createGroupTitle()),
  );

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

  protected openProfile(): void {
    if (this.user()) {
      this.isProfileOpen.set(true);
    }
  }

  private getInitials(value: string): string {
    return (
      value
        .split(/[\s-]+/)
        .map((part) => part.replace(/[^\p{L}\p{N}]/gu, ''))
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || '?'
    );
  }

  protected openLogout(): void {
    this.isLogoutOpen.set(true);
  }

  protected openCreateGroup(): void {
    const currentUser = this.user();

    if (!currentUser) {
      return;
    }

    this.createGroupTitle.set('');
    this.createGroupUsers.set([]);
    this.createGroupSelectedIds.set([]);
    this.createGroupError.set('');
    this.isCreateGroupLoading.set(true);
    this.isCreateGroupOpen.set(true);

    this.userProfileApi
      .getUsersOnce()
      .pipe(
        catchError(() => of<User[]>([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((users) => {
        this.createGroupUsers.set(
          users.filter((user) => user.id !== currentUser.id),
        );
        this.isCreateGroupLoading.set(false);
      });
  }

  protected onGroupTitleInput(event: Event): void {
    this.createGroupTitle.set((event.target as HTMLInputElement).value);
    this.createGroupError.set('');
  }

  protected onGroupSelectionChange(memberIds: string[]): void {
    this.createGroupSelectedIds.set(memberIds);
  }

  protected createGroup(): void {
    const title = this.createGroupTitle().trim();

    if (!title) {
      this.createGroupError.set('Введите название группы');
      return;
    }

    this.groupCreateRequested.emit({
      title,
      memberIds: this.createGroupSelectedIds(),
    });

    this.isCreateGroupOpen.set(false);
    this.visibleChange.emit(false);
  }

  protected confirmLogout(): void {
    this.auth.logout();
    this.isLogoutOpen.set(false);
    this.visibleChange.emit(false);
    void this.router.navigateByUrl('/login');
  }
}
