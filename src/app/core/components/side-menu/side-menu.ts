import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { DrawerModule } from '@openng/optimus-ui/drawer';
import { InputText } from '@openng/optimus-ui/inputtext';
import { ToggleSwitchModule } from '@openng/optimus-ui/toggleswitch';

import { AuthService } from '../../services/auth.service';
import { CurrentUserService } from '../../services/current-user.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  imports: [
    AvatarModule,
    ButtonModule,
    DialogModule,
    DrawerModule,
    FormsModule,
    InputText,
    ToggleSwitchModule,
  ],
  selector: 'app-side-menu',
  styleUrl: './side-menu.scss',
  templateUrl: './side-menu.html',
})
export class SideMenu {
  private readonly auth = inject(AuthService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly router = inject(Router);

  protected readonly theme = inject(ThemeService);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  protected readonly user = this.currentUser.currentUser;
  protected readonly isProfileOpen = signal(false);
  protected readonly isLogoutOpen = signal(false);
  protected readonly profileName = signal('');
  protected readonly profileUsername = signal('');
  protected readonly profileError = signal('');
  protected readonly profileSuccess = signal('');
  protected readonly isProfileSaving = signal(false);

  protected readonly oldPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly passwordError = signal('');
  protected readonly passwordSuccess = signal('');
  protected readonly isPasswordSaving = signal(false);

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

  protected readonly canSaveProfile = computed(
    () =>
      this.profileName().trim().length > 0 &&
      this.profileUsername().trim().length > 0,
  );

  protected readonly canChangePassword = computed(
    () =>
      this.oldPassword().length > 0 &&
      this.newPassword().length > 0 &&
      this.confirmPassword().length > 0,
  );

  protected openProfile(): void {
    const user = this.user();

    if (!user) {
      return;
    }

    this.profileName.set(user.displayName);
    this.profileUsername.set(user.username);
    this.profileError.set('');
    this.profileSuccess.set('');
    this.isProfileSaving.set(false);

    this.oldPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.passwordError.set('');
    this.passwordSuccess.set('');
    this.isPasswordSaving.set(false);

    this.isProfileOpen.set(true);
  }

  protected saveProfile(): void {
    if (!this.canSaveProfile()) {
      this.profileError.set('Заполните имя и username');
      return;
    }

    this.isProfileSaving.set(true);
    this.profileError.set('');
    this.profileSuccess.set('');

    this.auth
      .updateProfile({
        displayName: this.profileName().trim(),
        username: this.profileUsername().trim(),
      })
      .subscribe({
        next: (user) => {
          this.isProfileSaving.set(false);
          this.profileName.set(user.displayName);
          this.profileUsername.set(user.username);
          this.profileSuccess.set('Профиль сохранён');
        },
        error: (error: HttpErrorResponse) => {
          this.isProfileSaving.set(false);
          this.profileError.set(
            error.status === 409
              ? 'Этот username уже занят'
              : 'Не удалось сохранить профиль',
          );
        },
      });
  }

  protected changePassword(): void {
    if (!this.canChangePassword()) {
      this.passwordError.set('Заполните все поля');
      return;
    }

    if (this.newPassword() !== this.confirmPassword()) {
      this.passwordError.set('Пароли не совпадают');
      return;
    }

    this.isPasswordSaving.set(true);
    this.passwordError.set('');
    this.passwordSuccess.set('');

    this.auth
      .changePassword(this.oldPassword(), this.newPassword())
      .subscribe({
        next: () => {
          this.isPasswordSaving.set(false);
          this.oldPassword.set('');
          this.newPassword.set('');
          this.confirmPassword.set('');
          this.passwordSuccess.set('Пароль изменён');
        },
        error: (error: HttpErrorResponse) => {
          this.isPasswordSaving.set(false);
          this.passwordError.set(
            error.status === 400
              ? 'Старый пароль неверен'
              : 'Не удалось изменить пароль',
          );
        },
      });
  }

  protected onProfileNameInput(event: Event): void {
    this.profileName.set((event.target as HTMLInputElement).value);
    this.profileError.set('');
    this.profileSuccess.set('');
  }

  protected onProfileUsernameInput(event: Event): void {
    this.profileUsername.set((event.target as HTMLInputElement).value);
    this.profileError.set('');
    this.profileSuccess.set('');
  }

  protected onOldPasswordInput(event: Event): void {
    this.oldPassword.set((event.target as HTMLInputElement).value);
    this.passwordError.set('');
    this.passwordSuccess.set('');
  }

  protected onNewPasswordInput(event: Event): void {
    this.newPassword.set((event.target as HTMLInputElement).value);
    this.passwordError.set('');
    this.passwordSuccess.set('');
  }

  protected onConfirmPasswordInput(event: Event): void {
    this.confirmPassword.set((event.target as HTMLInputElement).value);
    this.passwordError.set('');
    this.passwordSuccess.set('');
  }

  protected openLogout(): void {
    this.isLogoutOpen.set(true);
  }

  protected confirmLogout(): void {
    this.auth.logout();
    this.isLogoutOpen.set(false);
    this.visibleChange.emit(false);
    void this.router.navigateByUrl('/login');
  }
}
