import { DatePipe } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { BadgeModule } from '@openng/optimus-ui/badge';
import { ListboxModule } from '@openng/optimus-ui/listbox';

import { CurrentUserService } from '../../services/current-user.service';
import { ChatListItem } from '../../type/chat-list-item';

@Component({
  imports: [AvatarModule, BadgeModule, DatePipe, FormsModule, ListboxModule],
  selector: 'app-chat-menu',
  styleUrl: './chat-menu.scss',
  templateUrl: './chat-menu.html',
})
export class ChatMenu {
  private readonly currentUser = inject(CurrentUserService);

  readonly chats = input.required<ChatListItem[]>();
  readonly selectedChatId = input<string | null>(null);

  readonly chatSelected = output<string>();

  protected readonly currentUserId = this.currentUser.currentUserId;

  protected onSelectionChange(value: string | null): void {
    if (typeof value === 'string') {
      this.chatSelected.emit(value);
    }
  }

  protected isGroup(chat: ChatListItem): boolean {
    return chat.peerUserId === null;
  }

  protected messagePreview(chat: ChatListItem): string {
    const isMine = chat.lastMessageAuthorId === this.currentUserId();
    const prefix = isMine
      ? 'Вы: '
      : this.isGroup(chat) && chat.lastMessageAuthorName
        ? `${chat.lastMessageAuthorName}: `
        : '';

    return `${prefix}${chat.lastMessage}`;
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
