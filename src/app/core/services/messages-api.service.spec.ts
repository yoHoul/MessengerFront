import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CurrentUserService } from './current-user.service';
import { MessagesApiService } from './messages-api.service';
import { UserProfileApiService } from './user-profile-api.service';
import { User } from '../type/user';

const currentUser: User = {
  id: '1',
  username: 'me',
  displayName: 'Я',
  avatarUrl: null,
};

const sourceAuthor: User = {
  id: '2',
  username: 'other',
  displayName: 'Другой',
  avatarUrl: null,
};

function message(id: string, chatId: string) {
  return {
    id,
    chatId,
    authorId: sourceAuthor.id,
    text: `Текст ${id}`,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('MessagesApiService mutations', () => {
  let service: MessagesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MessagesApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CurrentUserService,
          useValue: {
            currentUser: () => currentUser,
            currentUserId: () => currentUser.id,
          },
        },
        {
          provide: UserProfileApiService,
          useValue: {
            getProfile: vi.fn(() => of(sourceAuthor)),
            getUsers: vi.fn(() => of([currentUser, sourceAuthor])),
          },
        },
      ],
    });

    service = TestBed.inject(MessagesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('forwards a message into another chat with a source snapshot', () => {
    let forwardedId = '';
    let forwardedFrom = '';

    service.forwardMessage('1', '10', '2').subscribe((forwarded) => {
      forwardedId = forwarded?.id ?? '';
      forwardedFrom = forwarded?.forwardedFrom?.authorName ?? '';
    });

    http
      .expectOne('assets/mocks/messages/1.json')
      .flush([message('10', '1')]);
    http.expectOne('assets/mocks/messages/2.json').flush([]);

    expect(forwardedId).toMatch(/^\d+$/);
    expect(forwardedFrom).toBe('Другой');
  });
});
