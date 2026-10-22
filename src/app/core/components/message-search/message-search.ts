import {
  Component,
  ElementRef,
  OnInit,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { InputText } from '@openng/optimus-ui/inputtext';
import {
  Subject,
  Observable,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
} from 'rxjs';

import { CurrentUserService } from '../../services/current-user.service';
import { DirectoryStoreService } from '../../services/directory-store.service';
import { MessagesApiService } from '../../services/messages-api.service';
import { Message } from '../../type/message';

interface SearchOutcome {
  messages: Message[];
  source: 'local' | 'api' | 'error' | null;
}

@Component({
  imports: [DatePipe, InputText],
  selector: 'app-message-search',
  styleUrl: './message-search.scss',
  templateUrl: './message-search.html',
})
export class MessageSearch implements OnInit {
  private readonly currentUser = inject(CurrentUserService);
  private readonly directory = inject(DirectoryStoreService);
  private readonly messagesApi = inject(MessagesApiService);

  readonly messages = input<Message[]>([]);
  readonly chatId = input<string | null>(null);
  readonly chatTitle = input('');
  readonly isGroup = input(false);

  readonly closed = output<void>();
  readonly messageSelected = output<Message>();

  private readonly searchInput =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly searchQuery$ = new Subject<string>();

  protected readonly query = signal('');
  protected readonly results = signal<Message[]>([]);
  protected readonly source = signal<'local' | 'api' | 'error' | null>(null);
  protected readonly hasRun = signal(false);
  protected readonly isLoading = signal(false);

  constructor() {
    this.searchQuery$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((query): Observable<SearchOutcome> => {
          const chatId = this.chatId();
          const normalized = query.trim();
          const localResults = this.messages().filter((message) =>
            this.matches(message, normalized),
          );

          this.results.set([]);
          this.source.set(null);
          this.hasRun.set(false);
          this.isLoading.set(false);

          if (!chatId || normalized.length < 2) {
            return of({ messages: [], source: null });
          }

          if (localResults.length > 0) {
            return of({ messages: localResults, source: 'local' as const });
          }

          this.isLoading.set(true);

          return this.messagesApi.searchMessages(chatId, normalized).pipe(
            map((messages) => ({ messages, source: 'api' as const })),
            catchError(() =>
              of({ messages: [], source: 'error' as const }),
            ),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((outcome) => {
        this.results.set(outcome.messages);
        this.source.set(outcome.source);
        this.isLoading.set(false);
        this.hasRun.set(outcome.source !== null);
      });
  }

  ngOnInit(): void {
    setTimeout(() => this.searchInput()?.nativeElement.focus(), 0);
  }

  protected onInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.query.set(query);
    this.searchQuery$.next(query);
  }

  protected select(message: Message): void {
    this.messageSelected.emit(message);
  }

  protected authorName(message: Message): string {
    const currentUser = this.currentUser.currentUser();

    if (message.authorId === currentUser?.id) {
      return currentUser.displayName;
    }

    return (
      this.directory.getUser(message.authorId)?.displayName ??
      (this.isGroup() ? 'Пользователь' : this.chatTitle())
    );
  }

  protected messageText(message: Message): string {
    return (
      message.text ||
      message.attachments?.[0]?.name ||
      (message.attachments?.length ? 'Вложение' : '')
    );
  }

  private matches(message: Message, query: string): boolean {
    const normalized = query.trim().toLocaleLowerCase();

    if (!normalized) {
      return false;
    }

    const attachmentNames = (message.attachments ?? [])
      .map((attachment) => attachment.name)
      .join(' ');

    return `${message.text} ${attachmentNames}`
      .toLocaleLowerCase()
      .includes(normalized);
  }
}
