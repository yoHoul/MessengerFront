import { Component, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ListboxModule } from '@openng/optimus-ui/listbox';
import type { ListboxClickEvent } from '@openng/optimus-ui/types/listbox';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  switchMap,
} from 'rxjs';

import { SearchUsersApiService } from '../../services/search-users-api.service';
import { ChatListItem } from '../../type/chat-list-item';
import { User } from '../../type/user';

type SearchResult =
  | { kind: 'chat'; chat: ChatListItem }
  | { kind: 'user'; user: User };

interface SearchGroup {
  label: string;
  items: SearchResult[];
}

@Component({
  imports: [ListboxModule],
  selector: 'app-chat-search-results',
  styleUrl: './chat-search-results.scss',
  templateUrl: './chat-search-results.html',
})
export class ChatSearchResults {
  private readonly searchUsersApi = inject(SearchUsersApiService);

  readonly chats = input.required<ChatListItem[]>();
  readonly query = input.required<string>();

  readonly chatSelected = output<string>();
  readonly userSelected = output<User>();

  protected readonly users = signal<User[]>([]);
  protected readonly isUsersLoading = signal(false);

  private apiRequestId = 0;

  protected readonly tagSearch = computed(() =>
    this.query().trim().startsWith('@'),
  );

  protected readonly localChats = computed(() => {
    if (this.tagSearch()) {
      return [];
    }

    const query = this.query().trim().toLocaleLowerCase();

    if (!query) {
      return [];
    }

    return this.chats().filter((chat) =>
      chat.title.toLocaleLowerCase().includes(query),
    );
  });

  protected readonly groups = computed<SearchGroup[]>(() => {
    const groups: SearchGroup[] = [];

    if (this.localChats().length > 0) {
      groups.push({
        label: 'Чаты',
        items: this.localChats().map((chat): SearchResult => ({ kind: 'chat', chat })),
      });
    }

    if (this.users().length > 0) {
      groups.push({
        label: 'Пользователи',
        items: this.users().map((user): SearchResult => ({ kind: 'user', user })),
      });
    }

    return groups;
  });

  constructor() {
    toObservable(this.query)
      .pipe(
        map((query) => query.trim()),
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((query) => {
          const tagSearch = query.startsWith('@');
          const searchTerm = (tagSearch ? query.slice(1) : query).trim();

          this.users.set([]);

          if (!searchTerm || (!tagSearch && searchTerm.length < 2)) {
            this.isUsersLoading.set(false);
            return of<User[]>([]);
          }

          const requestId = ++this.apiRequestId;
          this.isUsersLoading.set(true);

          return this.searchUsersApi.searchUsers(searchTerm, tagSearch).pipe(
            catchError(() => of<User[]>([])),
            finalize(() => {
              if (requestId === this.apiRequestId) {
                this.isUsersLoading.set(false);
              }
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((users) => this.users.set(users));
  }

  protected onResultClick(event: ListboxClickEvent): void {
    const item = event.option as SearchResult | undefined;

    if (item?.kind === 'chat') {
      this.chatSelected.emit(item.chat.id);
    } else if (item?.kind === 'user') {
      this.userSelected.emit(item.user);
    }
  }
}
