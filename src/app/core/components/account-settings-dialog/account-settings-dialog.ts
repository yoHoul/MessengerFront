import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { InputText } from '@openng/optimus-ui/inputtext';

import { AuthService } from '../../services/auth.service';
import { CurrentUserService } from '../../services/current-user.service';
import { sanitizeTag } from '../../utils/tag';

@Component({
  imports: [ButtonModule, DialogModule, InputText],
  selector: 'app-account-settings-dialog',
  styleUrl: './account-settings-dialog.scss',
  templateUrl: './account-settings-dialog.html',
})
export class AccountSettingsDialog {
  private readonly auth = inject(AuthService);
  private readonly currentUser = inject(CurrentUserService);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  protected readonly user = this.currentUser.currentUser;
  protected readonly profileName = signal('');
  protected readonly profileUsername = signal('');
  protected readonly profileError = signal('');
  protected readonly profileSuccess = signal('');
  protected readonly isProfileSaving = signal(false);
  protected readonly oldPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly showOldPassword = signal(false);
  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly passwordError = signal('');
  protected readonly passwordSuccess = signal('');
  protected readonly isPasswordSaving = signal(false);

  protected readonly canSaveProfile = computed(() => {
    const user = this.user();

    if (!user) {
      return false;
    }

    const displayName = this.profileName().trim();
    const username = this.profileUsername().trim();

    return (
      displayName.length > 0 &&
      username.length > 0 &&
      (displayName !== user.displayName || username !== user.username)
    );
  });

  protected readonly canChangePassword = computed(
    () =>
      this.oldPassword().length > 0 &&
      this.newPassword().length > 0 &&
      this.confirmPassword().length > 0,
  );

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.resetForm();
      }
    });
  }

  protected saveProfile(): void {
    if (!this.canSaveProfile()) {
      this.profileError.set('Заполните имя и тэг аккаунта');
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
              ? 'Этот тэг уже занят'
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
    const input = event.target as HTMLInputElement;
    const username = sanitizeTag(input.value);

    if (input.value !== username) {
      input.value = username;
    }

    this.profileUsername.set(username);
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

  private resetForm(): void {
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
    this.showOldPassword.set(false);
    this.showNewPassword.set(false);
    this.showConfirmPassword.set(false);
  }
}
