import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { GroupInfoApiService } from './group-info-api.service';
import { UserProfileApiService } from './user-profile-api.service';
import { UserDirectoryApi } from '../api/user-directory-api';
import { User } from '../type/user';

const user: User = {
  id: '1',
  username: 'me',
  displayName: 'Я',
  avatarUrl: null,
};

const participant = {
  chatId: '2',
  userId: '1',
  role: 'owner' as const,
  joinedAt: '2026-01-01T00:00:00.000Z',
  lastReadMessageId: null,
  unreadCount: 0,
  muted: false,
  pinned: false,
};

describe('GroupInfoApiService', () => {
  let service: GroupInfoApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GroupInfoApiService,
        UserProfileApiService,
        { provide: UserDirectoryApi, useExisting: UserProfileApiService },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(GroupInfoApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads members without waiting for the user directory to complete', () => {
    let members: User[] = [];

    service.getMembers('2').subscribe((result) => {
      members = result;
    });

    http.expectOne('assets/mocks/participants.json').flush([participant]);
    http.expectOne('assets/mocks/users.json').flush([user]);
    http.expectOne('assets/mocks/search-users.json').flush([]);

    expect(members).toEqual([user]);
  });
});
