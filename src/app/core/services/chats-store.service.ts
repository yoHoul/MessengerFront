import { Injectable, signal } from '@angular/core';

import { ChatListItem } from '../type/chat-list-item';
import { ChatPreview } from '../type/chat-preview';

@Injectable({ providedIn: 'root' })
export class ChatsStoreService {
  private readonly chatsState = signal<ChatListItem[]>([]);

  readonly chats = this.chatsState.asReadonly();

  setChats(chats: ChatListItem[]): void {
    this.chatsState.set(chats.map((chat) => ({ ...chat })));
  }

  addChat(chat: ChatListItem): void {
    this.chatsState.update((chats) => [chat, ...chats]);
  }

  updateChat(chatId: string, patch: Partial<ChatListItem>): void {
    this.chatsState.update((chats) =>
      chats.map((chat) => (chat.id === chatId ? { ...chat, ...patch } : chat)),
    );
  }

  removeChat(chatId: string): void {
    this.chatsState.update((chats) =>
      chats.filter((chat) => chat.id !== chatId),
    );
  }

  clearUnread(chatId: string): void {
    this.updateChat(chatId, { unreadCount: 0 });
  }

  applyPreview(preview: ChatPreview, moveToTop = false): void {
    this.chatsState.update((chats) => {
      const chat = chats.find((item) => item.id === preview.chatId);

      if (!chat) {
        return chats;
      }

      const updated: ChatListItem = {
        ...chat,
        lastMessage: preview.lastMessage,
        lastMessageAt: preview.lastMessageAt,
        lastMessageAuthorId: preview.lastMessageAuthorId,
        lastMessageAuthorName: preview.lastMessageAuthorName,
      };

      if (!moveToTop) {
        return chats.map((item) => (item.id === updated.id ? updated : item));
      }

      return [updated, ...chats.filter((item) => item.id !== updated.id)];
    });
  }
}
