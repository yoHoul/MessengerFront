import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { ButtonModule } from '@openng/optimus-ui/button';
import { Textarea } from '@openng/optimus-ui/textarea';

import { UserProfileApiService } from '../../services/user-profile-api.service';
import { Message, MessageAttachment } from '../../type/message';
import { User } from '../../type/user';

interface MessageTextPart {
  text: string;
  href?: string;
}

@Component({
  imports: [AvatarModule, ButtonModule, DatePipe, Textarea],
  selector: 'app-message-item',
  styleUrl: './message-item.scss',
  templateUrl: './message-item.html',
})
export class MessageItem {
  private readonly userProfileApi = inject(UserProfileApiService);

  readonly message = input.required<Message>();
  readonly isGroup = input(false);
  readonly chatTitle = input('');
  readonly currentUserId = input<string | null>(null);
  readonly currentUserName = input('');
  readonly editing = input(false);
  readonly editDraft = input('');
  readonly highlighted = input(false);
  readonly replyTarget = input<Message | null>(null);

  readonly reply = output<Message>();
  readonly forward = output<Message>();
  readonly editStart = output<Message>();
  readonly editDraftChange = output<string>();
  readonly editSave = output<void>();
  readonly editCancel = output<void>();
  readonly deleteMessage = output<Message>();
  readonly openProfile = output<string>();
  readonly openImage = output<MessageAttachment>();
  readonly jumpReply = output<Message>();

  private readonly usersById = signal<Map<string, User>>(new Map());

  protected readonly isMine = computed(
    () => this.message().authorId === this.currentUserId(),
  );

  protected readonly authorName = computed(() => {
    if (this.isMine()) {
      return this.currentUserName() || 'Вы';
    }

    return (
      this.usersById().get(this.message().authorId)?.displayName ??
      (this.isGroup() ? 'Пользователь' : this.chatTitle())
    );
  });

  protected readonly authorInitials = computed(() =>
    this.getInitials(this.authorName()),
  );

  protected readonly hasReply = computed(() => {
    const message = this.message();
    return Boolean(message.replyTo || message.replyToId);
  });

  constructor() {
    this.userProfileApi
      .getUsers()
      .pipe(takeUntilDestroyed())
      .subscribe((users) =>
        this.usersById.set(
          new Map(users.map((user) => [user.id, user] as const)),
        ),
      );
  }

  protected replyAuthorName(): string {
    const message = this.message();

    if (message.replyTo) {
      return message.replyTo.authorName;
    }

    const target = this.replyTarget();

    if (!target) {
      return 'Сообщение';
    }

    if (target.authorId === this.currentUserId()) {
      return this.currentUserName() || 'Вы';
    }

    return this.usersById().get(target.authorId)?.displayName ??
      (this.isGroup() ? 'Пользователь' : this.chatTitle());
  }

  protected replyText(): string {
    const message = this.message();

    if (message.replyTo) {
      return message.replyTo.text;
    }

    const target = this.replyTarget();
    return target ? this.messageText(target) : 'Сообщение удалено';
  }

  protected messageText(message: Message): string {
    return (
      message.text ||
      message.attachments?.[0]?.name ||
      (message.attachments?.length ? 'Вложение' : '')
    );
  }

  protected messageTextParts(text: string): MessageTextPart[] {
    const parts: MessageTextPart[] = [];
    const linkPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
    let lastIndex = 0;

    for (const match of text.matchAll(linkPattern)) {
      const matchedText = match[0];
      const index = match.index ?? 0;
      const trailing = matchedText.match(/[.,!?;:)\]}'"»]+$/)?.[0] ?? '';
      const linkText = trailing
        ? matchedText.slice(0, -trailing.length)
        : matchedText;

      if (index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, index) });
      }

      if (linkText) {
        parts.push({
          text: linkText,
          href: /^https?:\/\//i.test(linkText)
            ? linkText
            : `https://${linkText}`,
        });
      }

      if (trailing) {
        parts.push({ text: trailing });
      }

      lastIndex = index + matchedText.length;
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex) });
    }

    return parts;
  }

  protected onEditInput(event: Event): void {
    this.editDraftChange.emit((event.target as HTMLTextAreaElement).value);
  }

  protected onEditEnter(event: Event): void {
    if ((event as KeyboardEvent).shiftKey) {
      return;
    }

    event.preventDefault();
    this.editSave.emit();
  }

  private getInitials(value: string): string {
    return (
      value
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || '?'
    );
  }
}
