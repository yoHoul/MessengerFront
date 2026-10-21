import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BarsIcon } from '@openng/optimus-ui/icons/bars';

import { ChatMenu } from '../../core/components/chat-menu/chat-menu';
import { ChatSearchResults } from '../../core/components/chat-search-results/chat-search-results';
import { ChatWindow } from '../../core/components/chat-window/chat-window';
import { ForwardDialog } from '../../core/components/forward-dialog/forward-dialog';
import { SearchChat } from '../../core/components/search-chat/search-chat';
import { SideMenu } from '../../core/components/side-menu/side-menu';
import { ChatsApiService } from '../../core/services/chats-api.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { GroupInfoApiService } from '../../core/services/group-info-api.service';
import { MessagesStoreService } from '../../core/services/messages-store.service';
import { ChatListItem } from '../../core/type/chat-list-item';
import { ChatPreview } from '../../core/type/chat-preview';
import { GroupCreateRequest } from '../../core/type/group-create-request';
import { GroupRenameRequest } from '../../core/type/group-rename-request';
import { Message } from '../../core/type/message';
import { MessageForwardRequest } from '../../core/type/message-forward-request';
import { User } from '../../core/type/user';

@Component({
  imports: [
    BarsIcon,
    ChatMenu,
    ChatSearchResults,
    ChatWindow,
    ForwardDialog,
    SearchChat,
    SideMenu,
  ],
  selector: 'app-main-page',
  styleUrl: './main-page.scss',
  templateUrl: './main-page.html',
})
export class MainPage {
  private readonly chatsApi = inject(ChatsApiService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly groupInfoApi = inject(GroupInfoApiService);
  private readonly messagesStore = inject(MessagesStoreService);

  private readonly chatsState = signal<ChatListItem[]>([]);

  protected readonly chats = this.chatsState.asReadonly();
  protected readonly isMenuOpen = signal(false);
  protected readonly isForwardOpen = signal(false);
  protected readonly forwardMessage = signal<Message | null>(null);
  protected readonly forwardAuthorName = signal('');
  protected readonly query = signal('');
  protected readonly selectedChatId = signal<string | null>(null);

  protected readonly isSearching = computed(
    () => this.query().trim().length > 0,
  );

  protected readonly selectedChat = computed(
    () => this.chats().find((chat) => chat.id === this.selectedChatId()) ?? null,
  );

  protected readonly forwardPreview = computed(() => {
    const message = this.forwardMessage();

    if (!message) {
      return '';
    }

    return message.text || message.attachments?.[0]?.name || 'Вложение';
  });

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

  protected onGroupCreateRequested(request: GroupCreateRequest): void {    const currentUser = this.currentUser.currentUser();
    const title = request.title.trim();

    if (!currentUser || !title) {
      return;
    }

    const chat: ChatListItem = {
      id: Date.now().toString(),
      title,
      lastMessage: 'Нет сообщений',
      lastMessageAt: null,
      lastMessageAuthorId: null,
      lastMessageAuthorName: null,
      unreadCount: 0,
      peerUserId: null,
      ownerId: currentUser.id,
    };

    this.chatsState.update((chats) => [chat, ...chats]);

    this.groupInfoApi
      .createGroup(chat.id, currentUser.id, request.memberIds)
      .subscribe(() => {
        this.selectChat(chat.id);
        this.query.set('');
      });
  }

  protected onGroupRenamed(request: GroupRenameRequest): void {
    this.chatsState.update((chats) =>
      chats.map((chat) =>
        chat.id === request.chatId ? { ...chat, title: request.title } : chat,
      ),
    );
  }

  protected onGroupDeleted(chatId: string): void {
    this.chatsState.update((chats) =>
      chats.filter((chat) => chat.id !== chatId),
    );

    if (this.selectedChatId() === chatId) {
      this.selectedChatId.set(null);
    }

    this.query.set('');
  }

  protected onLastMessageChanged(preview: ChatPreview): void {
    this.chatsState.update((chats) =>
      chats.map((chat) =>
        chat.id === preview.chatId
          ? {
              ...chat,
              lastMessage: preview.lastMessage,
              lastMessageAt: preview.lastMessageAt,
              lastMessageAuthorId: preview.lastMessageAuthorId,
              lastMessageAuthorName: preview.lastMessageAuthorName,
            }
          : chat,
      ),
    );
  }

  protected onForwardRequested(request: MessageForwardRequest): void {
    this.forwardMessage.set(request.message);
    this.forwardAuthorName.set(request.authorName);
    this.isForwardOpen.set(true);
  }

  protected onForwardSelected(targetChatId: string): void {
    const message = this.forwardMessage();
    const authorName = this.forwardAuthorName();
    const currentUser = this.currentUser.currentUser();

    if (!message || !authorName || !currentUser || targetChatId === message.chatId) {
      return;
    }

    const forwarded: Message = {
      id: Date.now().toString(),
      chatId: targetChatId,
      authorId: currentUser.id,
      text: message.text,
      createdAt: new Date().toISOString(),
      attachments: message.attachments,
      forwardedFrom: {
        authorId: message.authorId,
        authorName,
      },
    };

    this.messagesStore.appendMessage(targetChatId, forwarded).subscribe(() => {
      const preview =
        forwarded.text || forwarded.attachments?.[0]?.name || 'Вложение';

      this.chatsState.update((chats) => {
        const targetChat = chats.find((chat) => chat.id === targetChatId);

        if (!targetChat) {
          return chats;
        }

        return [
          {
            ...targetChat,
            lastMessage: preview,
            lastMessageAt: forwarded.createdAt,
            lastMessageAuthorId: currentUser.id,
            lastMessageAuthorName: currentUser.displayName,
            unreadCount: 0,
          },
          ...chats.filter((chat) => chat.id !== targetChatId),
        ];
      });

      this.isForwardOpen.set(false);
      this.forwardMessage.set(null);
      this.forwardAuthorName.set('');
    });
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
      lastMessageAt: null,
      lastMessageAuthorId: null,
      lastMessageAuthorName: null,
      unreadCount: 0,
      peerUserId: user.id,
    };

    this.chatsState.update((chats) => [chat, ...chats]);
    this.selectChat(chat.id);
    this.query.set('');
  }

  protected onMessageSent(message: Message): void {
    const authorName = this.currentUser.currentUser()?.displayName ?? null;
    const preview = message.text || message.attachments?.[0]?.name || 'Вложение';

    this.chatsState.update((chats) => {
      const chat = chats.find((item) => item.id === message.chatId);

      if (!chat) {
        return chats;
      }

      return [
        {
          ...chat,
          lastMessage: preview,
          lastMessageAt: message.createdAt,
          lastMessageAuthorId: message.authorId,
          lastMessageAuthorName: authorName,
          unreadCount: 0,
        },
        ...chats.filter((item) => item.id !== message.chatId),
      ];
    });
  }
}
