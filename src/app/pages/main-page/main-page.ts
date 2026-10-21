import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BarsIcon } from '@openng/optimus-ui/icons/bars';

import { ChatMenu } from '../../core/components/chat-menu/chat-menu';
import { ChatSearchResults } from '../../core/components/chat-search-results/chat-search-results';
import { ChatWindow } from '../../core/components/chat-window/chat-window';
import { SearchChat } from '../../core/components/search-chat/search-chat';
import { SideMenu } from '../../core/components/side-menu/side-menu';
import { ChatsApiService } from '../../core/services/chats-api.service';
import { ChatListItem } from '../../core/type/chat-list-item';
import { Message } from '../../core/type/message';
import { User } from '../../core/type/user';

@Component({
  imports: [BarsIcon, ChatMenu, ChatSearchResults, ChatWindow, SearchChat, SideMenu],
  selector: 'app-main-page',
  styleUrl: './main-page.scss',
  templateUrl: './main-page.html',
})
export class MainPage {
  private readonly chatsApi = inject(ChatsApiService);

  private readonly chatsState = signal<ChatListItem[]>([]);

  protected readonly chats = this.chatsState.asReadonly();
  protected readonly isMenuOpen = signal(false);
  protected readonly query = signal('');
  protected readonly selectedChatId = signal<string | null>(null);

  protected readonly isSearching = computed(
    () => this.query().trim().length > 0,
  );

  protected readonly selectedChat = computed(
    () => this.chats().find((chat) => chat.id === this.selectedChatId()) ?? null,
  );

  constructor() {
    this.chatsApi
      .getChats()
      .pipe(takeUntilDestroyed())
      .subscribe((chats) => this.chatsState.set(chats));
  }

  protected openMenu(): void {
    this.isMenuOpen.set(true);
  }

  protected setMenuOpen(open: boolean): void {
    this.isMenuOpen.set(open);
  }

  protected setQuery(query: string): void {
    this.query.set(query);
  }

  protected selectChat(chatId: string): void {
    this.selectedChatId.set(chatId);
    this.chatsState.update((chats) =>
      chats.map((chat) =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat,
      ),
    );
  }

  protected onSearchChatSelected(chatId: string): void {
    this.selectChat(chatId);
    this.query.set('');
  }

  protected onSearchUserSelected(user: User): void {
    this.openDirectChat(user);
  }

  protected onDirectChatRequested(user: User): void {
    this.openDirectChat(user);
  }

  private openDirectChat(user: User): void {
    const existingChat = this.chats().find(
      (chat) => chat.peerUserId === user.id,
    );

    if (existingChat) {
      this.selectChat(existingChat.id);
      this.query.set('');
      return;
    }

    const chat: ChatListItem = {
      id: Date.now().toString(),
      title: user.displayName,
      lastMessage: 'Нет сообщений',
      unreadCount: 0,
      peerUserId: user.id,
    };

    this.chatsState.update((chats) => [chat, ...chats]);
    this.selectChat(chat.id);
    this.query.set('');
  }

  protected onMessageSent(message: Message): void {
    this.chatsState.update((chats) => {
      const chat = chats.find((item) => item.id === message.chatId);

      if (!chat) {
        return chats;
      }

      return [
        { ...chat, lastMessage: message.text, unreadCount: 0 },
        ...chats.filter((item) => item.id !== message.chatId),
      ];
    });
  }
}
