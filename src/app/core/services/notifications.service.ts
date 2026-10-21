import { Injectable } from '@angular/core';

export interface IncomingNotification {
  chatId: string;
  chatTitle: string;
  authorName: string;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly sound = new Audio('assets/sounds/notification.mp3');

  constructor() {
    this.sound.preload = 'auto';
    this.sound.volume = 0.7;
  }

  requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return Promise.resolve('denied');
    }

    if (Notification.permission !== 'default') {
      return Promise.resolve(Notification.permission);
    }

    return Notification.requestPermission();
  }

  notifyIncoming(
    notification: IncomingNotification,
    activeChatId: string | null,
  ): void {
    if (notification.chatId === activeChatId) {
      return;
    }

    this.playSound();
    this.showBrowserNotification(notification);
  }

  private playSound(): void {
    this.sound.currentTime = 0;
    this.sound.play().catch(() => undefined);
  }

  private showBrowserNotification(notification: IncomingNotification): void {
    if (
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    try {
      new Notification(notification.chatTitle, {
        body: `${notification.authorName}: ${notification.text}`,
        tag: `chat-${notification.chatId}`,
        silent: true,
      });
    } catch {
      // Браузер может запретить уведомление без пользовательского жеста.
    }
  }
}
