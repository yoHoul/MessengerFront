import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

const THEME_STORAGE_KEY = 'messenger.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly darkState = signal(true);

  readonly isDark = this.darkState.asReadonly();

  constructor() {
    const isDark = this.readTheme();
    this.darkState.set(isDark);
    this.apply(isDark);
  }

  set(isDark: boolean): void {
    this.darkState.set(isDark);
    this.apply(isDark);
    this.writeTheme(isDark);
  }

  toggle(): void {
    this.set(!this.darkState());
  }

  private apply(isDark: boolean): void {
    this.document.documentElement.classList.toggle('p-dark', isDark);
  }

  private readTheme(): boolean {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) !== 'light';
    } catch {
      return true;
    }
  }

  private writeTheme(isDark: boolean): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Storage may be unavailable; the in-memory theme still works.
    }
  }
}
