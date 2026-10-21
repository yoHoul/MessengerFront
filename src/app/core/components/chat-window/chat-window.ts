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
import { catchError, of, switchMap } from 'rxjs';

import { CurrentUserService } from '../../services/current-user.service';
import { GroupInfoApiService } from '../../services/group-info-api.service';
import { MessagesApiService } from '../../services/messages-api.service';
import { UserProfileApiService } from '../../services/user-profile-api.service';
import { ChatListItem } from '../../type/chat-list-item';
import { Message } from '../../type/message';
import { User } from '../../type/user';

@Component({
  imports: [
    AvatarModule,
    ButtonModule,
    DatePipe,
    DialogModule,
    InputText,
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

  readonly chat = input<ChatListItem | null>(null);
  readonly messageSent = output<Message>();
  readonly directChatRequested = output<User>();

  protected readonly messages = signal<Message[]>([]);
  protected readonly draft = signal('');
  protected readonly isProfileOpen = signal(false);
  protected readonly profile = signal<User | null>(null);
  protected readonly usersById = signal<ReadonlyMap<string, User>>(new Map());
  protected readonly isGroupOpen = signal(false);
  protected readonly isGroupLoading = signal(false);
  protected readonly groupMembers = signal<User[]>([]);
  protected readonly currentUserId = this.currentUser.currentUserId;

  protected readonly canOpenProfile = computed(
    () =>
      this.chat()?.peerUserId !== null &&
      this.chat()?.peerUserId !== undefined,
  );

  protected readonly isGroup = computed(
    () => this.chat()?.peerUserId === null,
  );

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

          if (!chatId) {
            return of<Message[]>([]);
          }

          return this.messagesApi
            .getMessages(chatId)
            .pipe(catchError(() => of<Message[]>([])));
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
    this.draft.set((event.target as HTMLInputElement).value);
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
    };

    this.messages.update((messages) => [...messages, message]);
    this.draft.set('');
    this.messageSent.emit(message);
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

    this.groupInfoApi
      .getMembers(chat.id)
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
