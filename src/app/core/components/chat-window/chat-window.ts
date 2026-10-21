import { DatePipe } from '@angular/common';
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
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Textarea } from '@openng/optimus-ui/textarea';
import { catchError, of, switchMap, tap } from 'rxjs';

import { CurrentUserService } from '../../services/current-user.service';
import { GroupInfoApiService } from '../../services/group-info-api.service';
import { MessagesApiService } from '../../services/messages-api.service';
import { UserProfileApiService } from '../../services/user-profile-api.service';
import { ChatListItem } from '../../type/chat-list-item';
import { ChatPreview } from '../../type/chat-preview';
import { GroupRenameRequest } from '../../type/group-rename-request';
import { Message } from '../../type/message';
import { User } from '../../type/user';
import { UserPicker } from '../user-picker/user-picker';

@Component({
  imports: [
    AvatarModule,
    ButtonModule,
    DatePipe,
    DialogModule,
    InputText,
    Textarea,
    UserPicker,
  ],
  selector: 'app-chat-window',
  styleUrl: './chat-window.scss',
  templateUrl: './chat-window.html',
})
export class ChatWindow {
  private readonly messagesApi = inject(MessagesApiService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly userProfileApi = inject(UserProfileApiService);
  private readonly groupInfoApi = inject(GroupInfoApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly messagesContainer =
    viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  private readonly messagesByChat = new Map<string, Message[]>();

  readonly chat = input<ChatListItem | null>(null);
  readonly messageSent = output<Message>();
  readonly lastMessageChanged = output<ChatPreview>();
  readonly directChatRequested = output<User>();
  readonly groupRenamed = output<GroupRenameRequest>();
  readonly groupDeleted = output<string>();

  protected readonly messages = signal<Message[]>([]);
  protected readonly draft = signal('');
  protected readonly replyTo = signal<Message | null>(null);
  protected readonly editingMessageId = signal<string | null>(null);
  protected readonly editDraft = signal('');
  protected readonly messageToDelete = signal<Message | null>(null);
  protected readonly isDeleteMessageOpen = signal(false);
  protected readonly isProfileOpen = signal(false);
  protected readonly profile = signal<User | null>(null);
  protected readonly usersById = signal<ReadonlyMap<string, User>>(new Map());
  protected readonly isGroupOpen = signal(false);
  protected readonly isGroupLoading = signal(false);
  protected readonly groupMembers = signal<User[]>([]);
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

  protected readonly profileIsCurrentUser = computed(
    () => this.profile()?.id === this.currentUser.currentUserId(),
  );

  protected readonly profileName = computed(() => {
    const profile = this.profile();

    if (!profile) {
      return this.isGroup() ? 'Пользователь' : this.chat()?.title ?? '';
    }

    return `${profile.displayName}${this.profileIsCurrentUser() ? ' (Вы)' : ''}`;
  });

  protected readonly initials = computed(() =>
    this.getInitials(this.chat()?.title ?? ''),
  );

  protected readonly profileInitials = computed(() =>
    this.getInitials(this.profileName()),
  );

  protected readonly groupMemberCountLabel = computed(() => {
    const count = this.groupMembers().length;
    const mod100 = count % 100;
    const mod10 = count % 10;

    let word = 'участников';

    if (mod100 < 11 || mod100 > 14) {
      if (mod10 === 1) {
        word = 'участник';
      } else if (mod10 >= 2 && mod10 <= 4) {
        word = 'участника';
      }
    }

    return `${count} ${word}`;
  });

  private readonly chatId = computed(() => this.chat()?.id ?? null);

  constructor() {
    this.userProfileApi
      .getUsers()
      .pipe(
        catchError(() => of<User[]>([])),
        takeUntilDestroyed(),
      )
      .subscribe((users) =>
        this.usersById.set(
          new Map(users.map((user) => [user.id, user] as const)),
        ),
      );

    toObservable(this.chatId)
      .pipe(
        switchMap((chatId) => {
          this.messages.set([]);
          this.replyTo.set(null);
          this.editingMessageId.set(null);
          this.messageToDelete.set(null);
          this.isDeleteMessageOpen.set(false);

          if (!chatId) {
            return of<Message[]>([]);
          }

          const cachedMessages = this.messagesByChat.get(chatId);

          if (cachedMessages) {
            return of(cachedMessages);
          }

          return this.messagesApi.getMessages(chatId).pipe(
            tap((messages) => this.messagesByChat.set(chatId, messages)),
            catchError(() => of<Message[]>([])),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((messages) => this.messages.set(messages));

    effect(() => {
      this.messages();
      queueMicrotask(() => {
        const element = this.messagesContainer()?.nativeElement;
        element?.scrollTo({ top: element.scrollHeight });
      });
    });
  }

  protected isMine(message: Message): boolean {
    return message.authorId === this.currentUser.currentUserId();
  }

  protected author(message: Message): User | null {
    if (this.isMine(message)) {
      return this.currentUser.currentUser();
    }

    return this.usersById().get(message.authorId) ?? null;
  }

  protected authorName(message: Message): string {
    return (
      this.author(message)?.displayName ??
      (this.isGroup() ? 'Пользователь' : this.chat()?.title ?? '')
    );
  }

  protected authorInitials(message: Message): string {
    return this.getInitials(this.authorName(message));
  }

  protected onDraftInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  protected onComposerEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;

    if (keyboardEvent.shiftKey) {
      return;
    }

    event.preventDefault();
    this.send();
  }

  protected send(): void {
    const chat = this.chat();
    const text = this.draft().trim();
    const authorId = this.currentUser.currentUserId();

    if (!chat || !text || !authorId) {
      return;
    }

    const message: Message = {
      id: Date.now().toString(),
      chatId: chat.id,
      authorId,
      text,
      createdAt: new Date().toISOString(),
      replyToId: this.replyTo()?.id ?? null,
    };

    this.updateCurrentMessages([...this.messages(), message]);
    this.draft.set('');
    this.replyTo.set(null);
    this.messageSent.emit(message);
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

  protected onEditInput(event: Event): void {
    this.editDraft.set((event.target as HTMLTextAreaElement).value);
  }

  protected onEditEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;

    if (keyboardEvent.shiftKey) {
      return;
    }

    event.preventDefault();
    this.saveEdit();
  }

  protected saveEdit(): void {
    const messageId = this.editingMessageId();
    const text = this.editDraft().trim();

    if (!messageId || !text) {
      return;
    }

    const messages = this.messages().map((message) =>
      message.id === messageId
        ? { ...message, text, editedAt: new Date().toISOString() }
        : message,
    );

    this.updateCurrentMessages(messages);
    this.editingMessageId.set(null);
    this.editDraft.set('');

    const editedMessage = messages.find((message) => message.id === messageId);

    if (editedMessage && this.isLastMessage(editedMessage)) {
      this.emitLastMessagePreview();
    }
  }

  protected requestDeleteMessage(message: Message): void {
    if (!this.isMine(message)) {
      return;
    }

    this.messageToDelete.set(message);
    this.isDeleteMessageOpen.set(true);
  }

  protected confirmDeleteMessage(): void {
    const message = this.messageToDelete();

    if (!message) {
      return;
    }

    const wasLast = this.isLastMessage(message);
    const messages = this.messages().filter((item) => item.id !== message.id);

    this.updateCurrentMessages(messages);
    this.messageToDelete.set(null);
    this.isDeleteMessageOpen.set(false);

    if (wasLast) {
      this.emitLastMessagePreview();
    }
  }

  protected replyText(message: Message): string {
    return this.repliedMessage(message)?.text ?? 'Сообщение удалено';
  }

  protected replyAuthorName(message: Message): string {
    const repliedMessage = this.repliedMessage(message);

    return repliedMessage ? this.authorName(repliedMessage) : 'Сообщение';
  }

  private repliedMessage(message: Message): Message | null {
    const replyToId = message.replyToId;

    if (!replyToId) {
      return null;
    }

    return this.messages().find((item) => item.id === replyToId) ?? null;
  }

  private isLastMessage(message: Message): boolean {
    const messages = this.messages();

    return messages[messages.length - 1]?.id === message.id;
  }

  private updateCurrentMessages(messages: Message[]): void {
    this.messages.set(messages);

    const chatId = this.chat()?.id;

    if (chatId) {
      this.messagesByChat.set(chatId, messages);
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
      lastMessage: lastMessage?.text ?? 'Нет сообщений',
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

    const cachedProfile = this.usersById().get(userId);

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

  protected onGroupTitleInput(event: Event): void {
    this.groupTitleDraft.set((event.target as HTMLInputElement).value);
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
      .getUsers()
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
        catchError(() => of<User[]>([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((members) => {
        this.groupMembers.set(members);
        this.isGroupLoading.set(false);
      });
  }

  protected memberInitials(member: User): string {
    return this.getInitials(member.displayName);
  }

  protected memberName(member: User): string {
    let name = member.displayName;

    if (member.id === this.currentUserId()) {
      name += ' (Вы)';
    }

    if (member.id === this.chat()?.ownerId) {
      name += ' (Администратор группы)';
    }

    return name;
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
