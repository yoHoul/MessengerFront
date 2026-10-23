import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { catchError, of, switchMap } from 'rxjs';

import { CurrentUserService } from '../../services/current-user.service';
import { AttachmentsApi } from '../../api/attachments-api';
import { DirectoryStoreService } from '../../services/directory-store.service';
import { DraftsService } from '../../services/drafts.service';
import { GroupInfoApi } from '../../api/group-info-api';
import { MessagesApi } from '../../api/messages-api';
import { MessagesStoreService } from '../../services/messages-store.service';
import { UserDirectoryApi } from '../../api/user-directory-api';
import { ChatListItem } from '../../type/chat-list-item';
import { ChatPreview } from '../../type/chat-preview';
import { GroupRenameRequest } from '../../type/group-rename-request';
import { Message, MessageAttachment } from '../../type/message';
import { ChatMessagesState } from '../../type/message-page';
import { User } from '../../type/user';
import { AddMembersDialog } from '../add-members-dialog/add-members-dialog';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { GroupInfoDialog } from '../group-info-dialog/group-info-dialog';
import { MessageComposer } from '../message-composer/message-composer';
import { MessageItem } from '../message-item/message-item';
import { MessageSearch } from '../message-search/message-search';
import { UserProfileDialog } from '../user-profile-dialog/user-profile-dialog';

type ScrollMode = 'bottom' | 'preserve' | 'none';

@Component({
  imports: [
    AddMembersDialog,
    AvatarModule,
    ConfirmDialog,
    GroupInfoDialog,
    MessageComposer,
    MessageItem,
    MessageSearch,
    UserProfileDialog,
  ],
  selector: 'app-chat-window',
  styleUrl: './chat-window.scss',
  templateUrl: './chat-window.html',
})
export class ChatWindow {
  private readonly currentUser = inject(CurrentUserService);
  private readonly document = inject(DOCUMENT);
  private readonly attachmentsApi = inject(AttachmentsApi);
  private readonly directory = inject(DirectoryStoreService);
  private readonly drafts = inject(DraftsService);
  private readonly userProfileApi = inject(UserDirectoryApi);
  private readonly groupInfoApi = inject(GroupInfoApi);
  private readonly messagesApi = inject(MessagesApi);
  private readonly messagesStore = inject(MessagesStoreService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly messagesContainer =
    viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  private highlightTimer: ReturnType<typeof setTimeout> | null = null;
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;
  private targetScrollTimer: ReturnType<typeof setTimeout> | null = null;
  private restoreScrollTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly scrollMode = signal<ScrollMode>('bottom');
  private scrollAnchorHeight = 0;
  private scrollAnchorTop = 0;
  private searchScrollTop = 0;

  readonly chat = input<ChatListItem | null>(null);
  readonly messageSent = output<Message>();
  readonly lastMessageChanged = output<ChatPreview>();
  readonly forwardRequested = output<Message>();
  readonly directChatRequested = output<User>();
  readonly groupRenamed = output<GroupRenameRequest>();
  readonly groupDeleted = output<string>();
  readonly backRequested = output<void>();

  protected readonly messages = computed(() => {
    const chatId = this.chat()?.id;
    return chatId ? this.messagesStore.getState(chatId)?.messages ?? [] : [];
  });
  protected readonly draft = signal('');
  protected readonly pendingAttachments = signal<MessageAttachment[]>([]);
  protected readonly selectedImage = signal<MessageAttachment | null>(null);
  protected readonly hasMoreBefore = signal(false);
  protected readonly hasMoreAfter = signal(false);
  protected readonly isLoadingOlder = signal(false);
  protected readonly isLoadingNewer = signal(false);
  protected readonly isSending = signal(false);
  protected readonly isUploadingAttachments = signal(false);
  protected readonly messagesError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly isMessageSearchOpen = signal(false);
  protected readonly isImageOpen = signal(false);
  protected readonly replyTo = signal<Message | null>(null);
  protected readonly editingMessageId = signal<string | null>(null);
  protected readonly editDraft = signal('');
  protected readonly messageToDelete = signal<Message | null>(null);
  protected readonly isDeleteMessageOpen = signal(false);
  protected readonly highlightedMessageId = signal<string | null>(null);
  protected readonly isProfileOpen = signal(false);
  protected readonly profile = signal<User | null>(null);
  protected readonly isGroupOpen = signal(false);
  protected readonly isGroupLoading = signal(false);
  protected readonly groupMembers = signal<User[]>([]);
  protected readonly groupMembersError = signal('');
  protected readonly currentUserId = this.currentUser.currentUserId;
  protected readonly isAddMembersOpen = signal(false);
  protected readonly isAddMembersLoading = signal(false);
  protected readonly addMemberCandidates = signal<User[]>([]);
  protected readonly addSelectedIds = signal<string[]>([]);
  protected readonly addMemberError = signal('');
  protected readonly isGroupEditing = signal(false);
  protected readonly groupTitleDraft = signal('');
  protected readonly isDeleteGroupOpen = signal(false);

  protected readonly canOpenProfile = computed(
    () =>
      this.chat()?.peerUserId !== null &&
      this.chat()?.peerUserId !== undefined,
  );

  protected readonly isGroup = computed(
    () => this.chat()?.peerUserId === null,
  );

  protected readonly isGroupOwner = computed(
    () => this.chat()?.ownerId === this.currentUserId(),
  );

  protected readonly canRenameGroup = computed(() => {
    const currentTitle = this.chat()?.title.trim() ?? '';
    const draft = this.groupTitleDraft().trim();

    return draft.length > 0 && draft !== currentTitle;
  });

  protected readonly initials = computed(() =>
    this.getInitials(this.chat()?.title ?? ''),
  );

  protected readonly currentUserName = computed(
    () => this.currentUser.currentUser()?.displayName ?? '',
  );

  private readonly chatId = computed(() => this.chat()?.id ?? null);
  private readonly messagesById = computed(
    () => new Map(this.messages().map((message) => [message.id, message])),
  );

  constructor() {
    toObservable(this.chatId)
      .pipe(
        switchMap((chatId) => {
          this.hasMoreBefore.set(false);
          this.hasMoreAfter.set(false);
          this.isLoadingOlder.set(false);
          this.isLoadingNewer.set(false);
          this.scrollMode.set('bottom');
          this.closeMessageSearch(false);
          this.clearPendingAttachments();
          this.draft.set(chatId ? this.drafts.getDraft(chatId) : '');
          this.replyTo.set(null);
          this.editingMessageId.set(null);
          this.messageToDelete.set(null);
          this.isDeleteMessageOpen.set(false);
          this.messagesError.set(null);
          this.actionError.set(null);

          if (!chatId) {
            return of<ChatMessagesState>({
              messages: [],
              hasMoreBefore: false,
              nextBefore: null,
              hasMoreAfter: false,
              nextAfter: null,
              loadingOlder: false,
              loadingNewer: false,
            });
          }

          return this.messagesStore.getInitialPage(chatId).pipe(
            catchError(() => {
              this.messagesError.set('Не удалось загрузить сообщения');
              return of<ChatMessagesState>({
                messages: [],
                hasMoreBefore: false,
                nextBefore: null,
                hasMoreAfter: false,
                nextAfter: null,
                loadingOlder: false,
                loadingNewer: false,
              });
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((state) => {
        this.scrollMode.set('bottom');
        this.hasMoreBefore.set(state.hasMoreBefore);
        this.hasMoreAfter.set(state.hasMoreAfter);
        this.isLoadingOlder.set(false);
        this.isLoadingNewer.set(false);
        this.messagesError.set(null);
      });

    effect(() => {
      this.messages();
      const mode = this.scrollMode();

      if (this.scrollTimer) {
        clearTimeout(this.scrollTimer);
      }

      this.scrollTimer = setTimeout(() => {
        this.scrollTimer = null;
        const element = this.messagesContainer()?.nativeElement;

        if (!element) {
          this.scrollMode.set('none');
          return;
        }

        if (mode === 'bottom') {
          element.scrollTop = element.scrollHeight;
        } else if (mode === 'preserve') {
          element.scrollTop =
            this.scrollAnchorTop +
            (element.scrollHeight - this.scrollAnchorHeight);
        }

        this.scrollMode.set('none');
      }, 0);
    });

    this.destroyRef.onDestroy(() => {
      for (const timer of [
        this.highlightTimer,
        this.scrollTimer,
        this.targetScrollTimer,
        this.restoreScrollTimer,
      ]) {
        if (timer) {
          clearTimeout(timer);
        }
      }
    });
  }

  protected isMine(message: Message): boolean {
    return message.authorId === this.currentUser.currentUserId();
  }

  protected author(message: Message): User | null {
    if (this.isMine(message)) {
      return this.currentUser.currentUser();
    }

    return this.directory.getUser(message.authorId);
  }

  protected authorName(message: Message): string {
    return (
      this.author(message)?.displayName ??
      (this.isGroup() ? 'Пользователь' : this.chat()?.title ?? '')
    );
  }

  protected onDraftChange(text: string): void {
    const chatId = this.chat()?.id;

    this.draft.set(text);

    if (chatId) {
      this.drafts.setDraft(chatId, text);
    }
  }

  protected replyPreviewAuthor(): string {
    const reply = this.replyTo();
    return reply ? this.authorName(reply) : '';
  }

  protected replyPreviewText(): string {
    const reply = this.replyTo();
    return reply ? this.messageText(reply) : '';
  }

  protected send(): void {
    const chat = this.chat();
    const text = this.draft().trim();
    const replyToId = this.replyTo()?.id ?? null;
    const attachments = this.pendingAttachments();

    if (
      !chat ||
      (!text && attachments.length === 0) ||
      this.isSending() ||
      this.isUploadingAttachments()
    ) {
      return;
    }

    this.isSending.set(true);
    this.actionError.set(null);

    this.messagesApi
      .sendMessage(chat.id, { text, replyToId, attachments })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (message) => {
          this.isSending.set(false);
          this.actionError.set(null);
          this.closeMessageSearch(false);
          this.scrollMode.set('bottom');
          this.updateCurrentMessages([...this.messages(), message]);

          if (this.draft().trim() === text) {
            this.draft.set('');
            this.drafts.clearDraft(chat.id);
          }

          this.pendingAttachments.update((items) =>
            items.filter(
              (item) => !attachments.some((sent) => sent.id === item.id),
            ),
          );

          if (this.replyTo()?.id === replyToId) {
            this.replyTo.set(null);
          }

          this.messageSent.emit(message);
        },
        error: () => {
          this.isSending.set(false);
          this.actionError.set('Не удалось отправить сообщение');
        },
      });
  }

  protected onFilesSelected(files: File[]): void {
    if (files.length === 0 || this.isUploadingAttachments()) {
      return;
    }

    this.isUploadingAttachments.set(true);

    this.attachmentsApi
      .upload(files)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (attachments) => {
          this.isUploadingAttachments.set(false);
          this.actionError.set(null);
          this.pendingAttachments.update((items) => [...items, ...attachments]);
        },
        error: () => {
          this.isUploadingAttachments.set(false);
          this.actionError.set('Не удалось загрузить вложение');
        },
      });
  }

  protected removePendingAttachment(attachment: MessageAttachment): void {
    this.attachmentsApi.release([attachment]);
    this.pendingAttachments.update((items) =>
      items.filter((item) => item.id !== attachment.id),
    );
  }

  private clearPendingAttachments(): void {
    this.attachmentsApi.release(this.pendingAttachments());
    this.pendingAttachments.set([]);
  }

  protected openImage(attachment: MessageAttachment): void {
    this.selectedImage.set(attachment);
    this.isImageOpen.set(true);
  }

  protected closeImage(): void {
    this.isImageOpen.set(false);
    this.selectedImage.set(null);
  }

  protected startReply(message: Message): void {
    this.replyTo.set(message);
    this.editingMessageId.set(null);
  }

  protected cancelReply(): void {
    this.replyTo.set(null);
  }

  protected startEdit(message: Message): void {
    if (!this.isMine(message)) {
      return;
    }

    this.editingMessageId.set(message.id);
    this.editDraft.set(message.text);
    this.replyTo.set(null);
  }

  protected cancelEdit(): void {
    this.editingMessageId.set(null);
    this.editDraft.set('');
  }

  protected saveEdit(): void {
    const chat = this.chat();
    const messageId = this.editingMessageId();
    const text = this.editDraft().trim();

    if (!chat || !messageId || !text) {
      return;
    }

    this.messagesApi
      .editMessage(chat.id, messageId, text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (editedMessage) => {
          if (!editedMessage) {
            return;
          }

          const messages = this.messages().map((message) =>
            message.id === messageId ? editedMessage : message,
          );

          this.actionError.set(null);
          this.updateCurrentMessages(messages);
          this.editingMessageId.set(null);
          this.editDraft.set('');

          if (this.isLastMessage(editedMessage)) {
            this.emitLastMessagePreview();
          }
        },
        error: () => this.actionError.set('Не удалось изменить сообщение'),
      });
  }

  protected requestDeleteMessage(message: Message): void {
    if (!this.isMine(message)) {
      return;
    }

    this.messageToDelete.set(message);
    this.isDeleteMessageOpen.set(true);
  }

  protected requestForward(message: Message): void {
    this.forwardRequested.emit(message);
  }

  protected confirmDeleteMessage(): void {
    const chat = this.chat();
    const message = this.messageToDelete();

    if (!chat || !message) {
      return;
    }

    const wasLast = this.isLastMessage(message);

    this.messagesApi
      .deleteMessage(chat.id, message.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (deleted) => {
          if (!deleted) {
            return;
          }

          this.actionError.set(null);
          this.updateCurrentMessages(
            this.messages().filter((item) => item.id !== message.id),
          );
          this.messageToDelete.set(null);
          this.isDeleteMessageOpen.set(false);

          if (wasLast) {
            this.emitLastMessagePreview();
          }
        },
        error: () => this.actionError.set('Не удалось удалить сообщение'),
      });
  }

  protected messageText(message: Message): string {
    return (
      message.text ||
      message.attachments?.[0]?.name ||
      (message.attachments?.length ? 'Вложение' : '')
    );
  }

  protected toggleMessageSearch(): void {
    if (this.isMessageSearchOpen()) {
      this.closeMessageSearch();
      return;
    }

    this.searchScrollTop =
      this.messagesContainer()?.nativeElement.scrollTop ?? 0;
    this.isMessageSearchOpen.set(true);
  }

  protected closeMessageSearch(restoreScroll = true): void {
    const wasOpen = this.isMessageSearchOpen();

    this.isMessageSearchOpen.set(false);

    if (wasOpen && restoreScroll) {
      if (this.restoreScrollTimer) {
        clearTimeout(this.restoreScrollTimer);
      }

      this.restoreScrollTimer = setTimeout(() => {
        this.restoreScrollTimer = null;
        const element = this.messagesContainer()?.nativeElement;

        if (element) {
          element.scrollTop = this.searchScrollTop;
        }
      }, 0);
    }
  }

  protected onMessageSearchSelected(message: Message): void {
    this.jumpToMessageById(message.id);
  }

  protected onMessagesScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const atBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight <= 80;

    if (element.scrollTop <= 80) {
      this.loadOlder();
    } else if (atBottom) {
      this.loadNewer();
    }
  }

  protected loadOlder(): void {
    const chat = this.chat();

    if (!chat || this.isLoadingOlder() || !this.hasMoreBefore()) {
      return;
    }

    const element = this.messagesContainer()?.nativeElement;
    this.scrollAnchorHeight = element?.scrollHeight ?? 0;
    this.scrollAnchorTop = element?.scrollTop ?? 0;
    this.isLoadingOlder.set(true);

    this.messagesStore
      .loadOlder(chat.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) => {
          this.isLoadingOlder.set(false);

          if (!state) {
            this.scrollMode.set('none');
            return;
          }

          this.scrollMode.set('preserve');
          this.hasMoreBefore.set(state.hasMoreBefore);
          this.hasMoreAfter.set(state.hasMoreAfter);
        },
        error: () => {
          this.isLoadingOlder.set(false);
          this.scrollMode.set('none');
          this.actionError.set('Не удалось загрузить старые сообщения');
        },
      });
  }

  protected loadNewer(): void {
    const chat = this.chat();

    if (!chat || this.isLoadingNewer() || !this.hasMoreAfter()) {
      return;
    }

    this.isLoadingNewer.set(true);

    this.messagesStore
      .loadNewer(chat.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) => {
          this.isLoadingNewer.set(false);

          if (!state) {
            return;
          }

          this.scrollMode.set('bottom');
          this.hasMoreAfter.set(state.hasMoreAfter);
          this.hasMoreBefore.set(state.hasMoreBefore);
        },
        error: () => {
          this.isLoadingNewer.set(false);
          this.actionError.set('Не удалось загрузить новые сообщения');
        },
      });
  }

  protected jumpToMessage(message: Message): void {
    this.jumpToMessageById(this.replyTargetId(message));
  }

  private jumpToMessageById(targetId: string | null): void {
    const chat = this.chat();

    if (!chat || !targetId) {
      return;
    }

    this.messagesStore
      .ensureMessageLoaded(chat.id, targetId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((target) => {
        if (!target) {
          return;
        }

        this.scrollMode.set('none');
        const pagination = this.messagesStore.getPagination(chat.id);
        this.hasMoreBefore.set(pagination.hasMoreBefore);
        this.hasMoreAfter.set(pagination.hasMoreAfter);
        this.isLoadingOlder.set(false);
        this.isLoadingNewer.set(false);
        this.closeMessageSearch(false);

        if (this.targetScrollTimer) {
          clearTimeout(this.targetScrollTimer);
        }

        this.targetScrollTimer = setTimeout(() => {
          this.targetScrollTimer = null;
          const element = this.document.getElementById(`message-${targetId}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          this.highlightedMessageId.set(targetId);

          if (this.highlightTimer) {
            clearTimeout(this.highlightTimer);
          }

          this.highlightTimer = setTimeout(
            () => this.highlightedMessageId.set(null),
            1600,
          );
        }, 0);
      });
  }

  protected replyTarget(message: Message): Message | null {
    return this.repliedMessage(message);
  }

  private replyTargetId(message: Message): string | null {
    return message.replyTo?.messageId ?? message.replyToId ?? null;
  }

  private repliedMessage(message: Message): Message | null {
    const replyToId = this.replyTargetId(message);

    if (!replyToId) {
      return null;
    }

    return this.messagesById().get(replyToId) ?? null;
  }

  private isLastMessage(message: Message): boolean {
    const messages = this.messages();

    return messages[messages.length - 1]?.id === message.id;
  }

  private updateCurrentMessages(messages: Message[]): void {
    const chatId = this.chat()?.id;

    if (chatId) {
      this.messagesStore.setMessages(chatId, messages);
    }
  }

  private emitLastMessagePreview(): void {
    const chat = this.chat();

    if (!chat) {
      return;
    }

    const messages = this.messages();
    const lastMessage = messages[messages.length - 1] ?? null;

    this.lastMessageChanged.emit({
      chatId: chat.id,
      lastMessage: lastMessage
        ? this.messageText(lastMessage)
        : 'Нет сообщений',
      lastMessageAt: lastMessage?.createdAt ?? null,
      lastMessageAuthorId: lastMessage?.authorId ?? null,
      lastMessageAuthorName: lastMessage
        ? this.authorName(lastMessage)
        : null,
    });
  }

  protected openProfile(): void {
    const peerUserId = this.chat()?.peerUserId;

    if (peerUserId) {
      this.openUserProfile(peerUserId);
    }
  }

  protected openUserProfile(userId: string): void {
    const currentUser = this.currentUser.currentUser();

    if (currentUser?.id === userId) {
      this.profile.set(currentUser);
      this.isProfileOpen.set(true);
      return;
    }

    const cachedProfile = this.directory.getUser(userId);

    if (cachedProfile) {
      this.profile.set(cachedProfile);
      this.isProfileOpen.set(true);
      return;
    }

    this.profile.set(null);
    this.isProfileOpen.set(true);

    this.userProfileApi
      .getProfile(userId)
      .pipe(
        catchError(() => of<User | null>(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((profile) => this.profile.set(profile));
  }

  protected openGroup(): void {
    const chat = this.chat();

    if (!chat || chat.peerUserId !== null) {
      return;
    }

    this.groupMembers.set([]);
    this.groupMembersError.set('');
    this.isGroupLoading.set(true);
    this.isGroupOpen.set(true);
    this.isGroupEditing.set(false);
    this.groupTitleDraft.set('');
    this.loadGroupMembers(chat.id);
  }

  protected startGroupRename(): void {
    const chat = this.chat();

    if (!chat || !this.isGroupOwner()) {
      return;
    }

    this.groupTitleDraft.set(chat.title);
    this.isGroupEditing.set(true);
  }

  protected cancelGroupRename(): void {
    this.isGroupEditing.set(false);
    this.groupTitleDraft.set('');
  }

  protected renameGroup(): void {
    const chat = this.chat();
    const title = this.groupTitleDraft().trim();

    if (!chat || !this.isGroupOwner() || !this.canRenameGroup()) {
      return;
    }

    this.groupRenamed.emit({ chatId: chat.id, title });
    this.isGroupEditing.set(false);
    this.groupTitleDraft.set('');
  }

  protected openDeleteGroup(): void {
    if (!this.isGroupOwner()) {
      return;
    }

    this.isDeleteGroupOpen.set(true);
  }

  protected confirmDeleteGroup(): void {
    const chat = this.chat();

    if (!chat || !this.isGroupOwner()) {
      return;
    }

    this.groupInfoApi.deleteGroup(chat.id).subscribe(() => {
      this.isDeleteGroupOpen.set(false);
      this.isGroupOpen.set(false);
      this.groupDeleted.emit(chat.id);
    });
  }

  protected openAddMembers(): void {
    const chat = this.chat();

    if (!chat || chat.peerUserId !== null || this.isGroupLoading()) {
      return;
    }

    this.addSelectedIds.set([]);
    this.addMemberCandidates.set([]);
    this.addMemberError.set('');
    this.isAddMembersLoading.set(true);
    this.isAddMembersOpen.set(true);

    this.userProfileApi
      .getUsersOnce()
      .pipe(
        catchError(() => of<User[]>([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((users) => {
        const memberIds = new Set(
          this.groupMembers().map((member) => member.id),
        );
        this.addMemberCandidates.set(
          users.filter((user) => !memberIds.has(user.id)),
        );
        this.isAddMembersLoading.set(false);
      });
  }

  protected onAddMemberSelectionChange(memberIds: string[]): void {
    this.addSelectedIds.set(memberIds);
    this.addMemberError.set('');
  }

  protected addMembers(): void {
    const chat = this.chat();
    const memberIds = this.addSelectedIds();

    if (!chat || memberIds.length === 0) {
      this.addMemberError.set('Выберите участников');
      return;
    }

    this.groupInfoApi.addMembers(chat.id, memberIds).subscribe(() => {
      this.isAddMembersOpen.set(false);
      this.loadGroupMembers(chat.id);
    });
  }

  protected removeMember(member: User): void {
    const chat = this.chat();

    if (!chat || !this.isGroupOwner()) {
      return;
    }

    this.groupInfoApi.removeMember(chat.id, member.id).subscribe(() => {
      this.groupMembers.update((members) =>
        members.filter((item) => item.id !== member.id),
      );
    });
  }

  private loadGroupMembers(chatId: string): void {
    this.isGroupLoading.set(true);

    this.groupInfoApi
      .getMembers(chatId)
      .pipe(
        catchError(() => {
          this.groupMembersError.set('Не удалось загрузить участников');
          return of<User[]>([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((members) => {
        this.groupMembers.set(members);
        this.isGroupLoading.set(false);
      });
  }

  protected requestDirectChat(member: User): void {
    this.isProfileOpen.set(false);
    this.isGroupOpen.set(false);
    this.directChatRequested.emit(member);
  }

  private getInitials(value: string): string {
    return (
      value
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
