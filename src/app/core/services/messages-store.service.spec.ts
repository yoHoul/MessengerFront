import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Message } from '../type/message';
import { MessagePage } from '../type/message-page';
import { MessagesApiService } from './messages-api.service';
import { MessagesStoreService } from './messages-store.service';

function message(id: string): Message {
  return {
    id,
    chatId: '1',
    authorId: '1',
    text: `Сообщение ${id}`,
    createdAt: `2026-01-01T00:00:0${id}.000Z`,
  };
}

function page(ids: string[], hasMoreBefore = false): MessagePage {
  const messages = ids.map(message);

  return {
    messages,
    hasMoreBefore,
    nextBefore: messages[0]?.id ?? null,
    hasMoreAfter: false,
    nextAfter: messages[messages.length - 1]?.id ?? null,
  };
}

describe('MessagesStoreService', () => {
  let service: MessagesStoreService;

  beforeEach(() => {
    const api = {
      getMessages: vi.fn((_chatId: string, options: { before?: string | null }) =>
        options.before ? of(page(['1', '2'])) : of(page(['3', '4'], true)),
      ),
      getMessageContext: vi.fn(() => of(page(['2', '3', '4']))),
      searchMessages: vi.fn(() => of([])),
    };

    TestBed.configureTestingModule({
      providers: [
        MessagesStoreService,
        { provide: MessagesApiService, useValue: api },
      ],
    });

    service = TestBed.inject(MessagesStoreService);
  });

  it('loads the initial page and prepends older messages', () => {
    let result: string[] = [];

    service.getInitialPage('1').subscribe((state) => {
      result = state.messages.map((item) => item.id);
    });

    expect(result).toEqual(['3', '4']);

    service.loadOlder('1').subscribe((state) => {
      result = state?.messages.map((item) => item.id) ?? [];
    });

    expect(result).toEqual(['1', '2', '3', '4']);
  });

  it('does not duplicate appended messages', () => {
    service.getInitialPage('1').subscribe();
    service.appendMessage('1', message('3')).subscribe();
    service.appendMessage('1', message('3')).subscribe();

    expect(
      service.getLoadedMessages('1').filter((item) => item.id === '3'),
    ).toHaveLength(1);
  });

  it('loads newer messages in a window', () => {
    const api = TestBed.inject(MessagesApiService) as unknown as {
      getMessages: ReturnType<typeof vi.fn>;
    };

    api.getMessages.mockImplementation(
      (_chatId: string, options: { after?: string | null }) =>
        options.after
          ? of(page(['5', '6']))
          : of({
              ...page(['3', '4'], true),
              hasMoreAfter: true,
              nextAfter: '4',
            }),
    );

    service.getInitialPage('1').subscribe();
    service.loadNewer('1').subscribe((state) => {
      expect(state?.messages.map((item) => item.id)).toEqual([
        '3',
        '4',
        '5',
        '6',
      ]);
    });
  });
});
