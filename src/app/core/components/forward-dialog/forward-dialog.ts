import { Component, computed, effect, input, output, signal } from '@angular/core';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';

import { ChatListItem } from '../../type/chat-list-item';

@Component({
  imports: [AvatarModule, ButtonModule, DialogModule],
  selector: 'app-forward-dialog',
  styleUrl: './forward-dialog.scss',
  templateUrl: './forward-dialog.html',
})
export class ForwardDialog {
  readonly visible = input(false);
  readonly chats = input.required<ChatListItem[]>();
  readonly sourceChatId = input<string | null>(null);
  readonly messagePreview = input('');

  readonly visibleChange = output<boolean>();
  readonly forward = output<string>();

  protected readonly selectedChatId = signal<string | null>(null);

  protected readonly availableChats = computed(() =>
    this.chats().filter((chat) => chat.id !== this.sourceChatId()),
  );

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.selectedChatId.set(null);
      }
    });
  }

  protected selectChat(chatId: string): void {
    this.selectedChatId.set(chatId);
  }

  protected confirmForward(): void {
    const chatId = this.selectedChatId();

    if (chatId) {
      this.forward.emit(chatId);
    }
  }

  protected initials(chat: ChatListItem): string {
    return (
      chat.title
        .split(/[\s-]+/)
        .map((part) => part.replace(/[^\p{L}\p{N}]/gu, ''))
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || '?'
    );
  }
}
