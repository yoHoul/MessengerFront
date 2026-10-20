import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly darkState = signal(true);

  readonly isDark = this.darkState.asReadonly();

  constructor() {
    this.apply(true);
  }

  set(isDark: boolean): void {
    this.darkState.set(isDark);
    this.apply(isDark);
  }

  toggle(): void {
    this.set(!this.darkState());
  }

  private apply(isDark: boolean): void {
    this.document.documentElement.classList.toggle('p-dark', isDark);
  }
}
