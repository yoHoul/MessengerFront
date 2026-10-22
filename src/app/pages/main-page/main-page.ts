import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { BarsIcon } from '@openng/optimus-ui/icons/bars';

import { ChatMenu } from '../../core/components/chat-menu/chat-menu';
import { ChatSearchResults } from '../../core/components/chat-search-results/chat-search-results';
import { ChatWindow } from '../../core/components/chat-window/chat-window';
import { ForwardDialog } from '../../core/components/forward-dialog/forward-dialog';
import { SearchChat } from '../../core/components/search-chat/search-chat';
import { SideMenu } from '../../core/components/side-menu/side-menu';
import { ChatsApiService } from '../../core/services/chats-api.service';
import { ChatsStoreService } from '../../core/services/chats-store.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { GroupInfoApiService } from '../../core/services/group-info-api.service';
import { MessagesApiService } from '../../core/services/messages-api.service';
import { MessagesStoreService } from '../../core/services/messages-store.service';
import { ChatPreview } from '../../core/type/chat-preview';
import { GroupCreateRequest } from '../../core/type/group-create-request';
import { GroupRenameRequest } from '../../core/type/group-rename-request';
import { Message } from '../../core/type/message';
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
  private readonly chatsStore = inject(ChatsStoreService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly groupInfoApi = inject(GroupInfoApiService);
  private readonly messagesApi = inject(MessagesApiService);
  private readonly messagesStore = inject(MessagesStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly chats = this.chatsStore.chats;
  protected readonly isMenuOpen = signal(false);
  protected readonly isForwardOpen = signal(false);
  protected readonly forwardMessage = signal<Message | null>(null);
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
    this.route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const chatId = params.get('chatId');
        this.selectedChatId.set(chatId);

        if (chatId) {
          this.chatsStore.clearUnread(chatId);
        }
      });

    this.chatsApi
      .getChats()
      .pipe(takeUntilDestroyed())
      .subscribe((chats) => {
        this.chatsStore.setChats(chats);

        const selectedChatId = this.selectedChatId();

        if (selectedChatId) {
          this.chatsStore.clearUnread(selectedChatId);
        }

        if (
          selectedChatId &&
          !chats.some((chat) => chat.id === selectedChatId)
        ) {
          void this.router.navigateByUrl('/chats');
        }
      });
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
    this.chatsStore.clearUnread(chatId);
    void this.router.navigate(['/chats', chatId]);
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

  protected onGroupCreateRequested(request: GroupCreateRequest): void {
    const currentUser = this.currentUser.currentUser();
    const title = request.title.trim();

    if (!currentUser || !title) {
      return;
    }

    this.chatsApi
      .createGroupChat(title, currentUser.id)
      .pipe(takeUntilDestroyed())
      .subscribe((chat) => {
        this.chatsStore.addChat(chat);

        this.groupInfoApi
          .createGroup(chat.id, currentUser.id, request.memberIds)
          .subscribe(() => {
            this.selectChat(chat.id);
            this.query.set('');
          });
      });
  }

  protected onGroupRenamed(request: GroupRenameRequest): void {
    this.chatsApi
      .renameChat(request.chatId, request.title)
      .pipe(takeUntilDestroyed())
      .subscribe(() =>
        this.chatsStore.updateChat(request.chatId, { title: request.title }),
      );
  }

  protected onGroupDeleted(chatId: string): void {
    this.chatsApi
      .deleteChat(chatId)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.chatsStore.removeChat(chatId);

        if (this.selectedChatId() === chatId) {
          this.selectedChatId.set(null);
          void this.router.navigateByUrl('/chats');
        }

        this.query.set('');
      });
  }

  protected onLastMessageChanged(preview: ChatPreview): void {
    this.chatsStore.applyPreview(preview);
  }

  protected onForwardRequested(message: Message): void {
    this.forwardMessage.set(message);
    this.isForwardOpen.set(true);
  }

  protected onForwardSelected(targetChatId: string): void {
    const message = this.forwardMessage();

    if (!message || targetChatId === message.chatId) {
      return;
    }

    this.messagesApi
      .forwardMessage(message.chatId, message.id, targetChatId)
      .pipe(takeUntilDestroyed())
      .subscribe((forwarded) => {
        if (!forwarded) {
          return;
        }

        this.messagesStore
          .appendMessage(targetChatId, forwarded)
          .subscribe(() => {
            const preview =
              forwarded.text || forwarded.attachments?.[0]?.name || 'Вложение';
            const currentUser = this.currentUser.currentUser();

            this.chatsStore.applyPreview(
              {
                chatId: targetChatId,
                lastMessage: preview,
                lastMessageAt: forwarded.createdAt,
                lastMessageAuthorId: forwarded.authorId,
                lastMessageAuthorName: currentUser?.displayName ?? null,
              },
              true,
            );
            this.chatsStore.clearUnread(targetChatId);

            this.isForwardOpen.set(false);
            this.forwardMessage.set(null);
          });
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

    this.chatsApi
      .createDirectChat(user)
      .pipe(takeUntilDestroyed())
      .subscribe((chat) => {
        this.chatsStore.addChat(chat);
        this.selectChat(chat.id);
        this.query.set('');
      });
  }

  protected onMessageSent(message: Message): void {
    const authorName = this.currentUser.currentUser()?.displayName ?? null;
    const preview = message.text || message.attachments?.[0]?.name || 'Вложение';

    this.chatsStore.applyPreview(
      {
        chatId: message.chatId,
        lastMessage: preview,
        lastMessageAt: message.createdAt,
        lastMessageAuthorId: message.authorId,
        lastMessageAuthorName: authorName,
      },
      true,
    );
    this.chatsStore.clearUnread(message.chatId);
  }
}
