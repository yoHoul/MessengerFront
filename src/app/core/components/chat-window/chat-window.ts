import { DatePipe } from '@angular/common';
import {
  Component,
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
import { InputText } from '@openng/optimus-ui/inputtext';
import { of, switchMap } from 'rxjs';

import { CurrentUserService } from '../../services/current-user.service';
import { MessagesApiService } from '../../services/messages-api.service';
import { ChatListItem } from '../../type/chat-list-item';
import { Message } from '../../type/message';

@Component({
  imports: [AvatarModule, ButtonModule, DatePipe, InputText],
  selector: 'app-chat-window',
  styleUrl: './chat-window.scss',
  templateUrl: './chat-window.html',
})
export class ChatWindow {
  private readonly messagesApi = inject(MessagesApiService);
  private readonly currentUser = inject(CurrentUserService);

  private readonly messagesContainer =
    viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  readonly chat = input<ChatListItem | null>(null);
  readonly messageSent = output<Message>();

  protected readonly messages = signal<Message[]>([]);
  protected readonly draft = signal('');

  protected readonly initials = computed(() => {
    const title = this.chat()?.title ?? '';
    return (
      title
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || '?'
    );
  });

  private readonly chatId = computed(() => this.chat()?.id ?? null);

  constructor() {
    toObservable(this.chatId)
      .pipe(
        switchMap((chatId) =>
          chatId ? this.messagesApi.getMessages(chatId) : of<Message[]>([]),
        ),
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
}
