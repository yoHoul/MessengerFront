import { TestBed } from '@angular/core/testing';

import { ChatsStoreService } from './chats-store.service';
import { ChatListItem } from '../type/chat-list-item';

function chat(id: string, overrides: Partial<ChatListItem> = {}): ChatListItem {
  return {
    id,
    title: `Чат ${id}`,
    lastMessage: 'Старое',
    lastMessageAt: '2026-01-01T00:00:00.000Z',
    lastMessageAuthorId: '1',
    lastMessageAuthorName: 'Пользователь',
    unreadCount: 0,
    peerUserId: null,
    ...overrides,
  };
}

describe('ChatsStoreService', () => {
  let service: ChatsStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatsStoreService);
  });

  it('keeps a single source of truth for chats', () => {
    service.setChats([chat('1'), chat('2')]);

    expect(service.chats().map((item) => item.id)).toEqual(['1', '2']);
  });

  it('updates preview without changing order by default', () => {
    service.setChats([chat('1'), chat('2')]);
    service.applyPreview({
      chatId: '2',
      lastMessage: 'Новое',
      lastMessageAt: '2026-01-02T00:00:00.000Z',
      lastMessageAuthorId: '2',
      lastMessageAuthorName: 'Аня',
    });

    expect(service.chats().map((item) => item.id)).toEqual(['1', '2']);
    expect(service.chats()[1].lastMessage).toBe('Новое');
  });

  it('moves a chat to the top on a sent message and clears unread', () => {
    service.setChats([chat('1', { unreadCount: 3 }), chat('2')]);
    service.applyPreview(
      {
        chatId: '1',
        lastMessage: 'Ответ',
        lastMessageAt: '2026-01-02T00:00:00.000Z',
        lastMessageAuthorId: '1',
        lastMessageAuthorName: 'Я',
      },
      true,
    );
    service.clearUnread('1');

    expect(service.chats()[0].id).toBe('1');
    expect(service.chats()[0].unreadCount).toBe(0);
  });
});
