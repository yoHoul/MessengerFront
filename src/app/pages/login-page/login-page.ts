import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputText } from '@openng/optimus-ui/inputtext';

import { AuthService } from '../../core/services/auth.service';

@Component({
  imports: [ButtonModule, InputText],
  selector: 'app-login-page',
  styleUrl: './login-page.scss',
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly mode = signal<'login' | 'register'>('login');
  protected readonly login = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly error = signal('');
  protected readonly isSubmitting = signal(false);

  protected readonly isRegistering = computed(() => this.mode() === 'register');

  protected onLoginInput(event: Event): void {
    this.login.set((event.target as HTMLInputElement).value);
  }

  protected onPasswordInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected onConfirmPasswordInput(event: Event): void {
    this.confirmPassword.set((event.target as HTMLInputElement).value);
  }

  protected switchMode(): void {
    this.mode.update((mode) => (mode === 'login' ? 'register' : 'login'));
    this.error.set('');
    this.confirmPassword.set('');
    this.showPassword.set(false);
    this.showConfirmPassword.set(false);
  }

  private redirectAfterAuth(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const target =
      returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
        ? returnUrl
        : '/chats';

    void this.router.navigateByUrl(target);
  }

  protected submit(event?: Event): void {
    event?.preventDefault();

    if (this.isRegistering()) {
      this.submitRegistration();
      return;
    }

    this.submitLogin();
  }

  private submitLogin(): void {
    const login = this.login().trim();
    const password = this.password();

    if (!login || !password) {
      this.error.set('Введите логин и пароль');
      return;
    }

    this.error.set('');
    this.isSubmitting.set(true);

    this.auth.login({ login, password }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        void this.redirectAfterAuth();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.error.set('Неверный логин или пароль');
      },
    });
  }

  private submitRegistration(): void {
    const login = this.login().trim();
    const password = this.password();
    const confirmPassword = this.confirmPassword();

    if (!login || !password || !confirmPassword) {
      this.error.set('Заполните все поля');
      return;
    }

    if (password !== confirmPassword) {
      this.error.set('Пароли не совпадают');
      return;
    }

    this.error.set('');
    this.isSubmitting.set(true);

    this.auth.register({ login, password }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        void this.redirectAfterAuth();
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.error.set(
          error.status === 409
            ? 'Этот логин уже занят'
            : 'Не удалось зарегистрироваться',
        );
      },
    });
  }
}
