import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_CONFIG } from '../api-config';
import { HttpChatsApiService } from './http-chats-api.service';
import { HttpMessagesApiService } from './http-messages-api.service';

const config = { baseUrl: '/api', useMockApi: false };

describe('HTTP API adapters', () => {
  let chats: HttpChatsApiService;
  let messages: HttpMessagesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HttpChatsApiService,
        HttpMessagesApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: config },
      ],
    });

    chats = TestBed.inject(HttpChatsApiService);
    messages = TestBed.inject(HttpMessagesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the chat list from the configured base URL', () => {
    chats.getChats().subscribe();

    http.expectOne('/api/chats').flush([]);
  });

  it('sends messages with reply and attachment ids', () => {
    messages
      .sendMessage('2', {
        text: 'Привет',
        replyToId: '10',
        attachments: [
          {
            id: '200',
            name: 'file.txt',
            type: 'text/plain',
            size: 4,
            url: '/attachments/200',
            isImage: false,
          },
        ],
      })
      .subscribe();

    const request = http.expectOne('/api/chats/2/messages');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      text: 'Привет',
      replyToId: '10',
      attachmentIds: ['200'],
    });
    request.flush({});
  });

  it('passes pagination cursors as query parameters', () => {
    messages
      .getMessages('2', { before: '20', limit: 20 })
      .subscribe();

    const request = http.expectOne(
      (req) => req.url === '/api/chats/2/messages',
    );
    expect(request.request.params.get('before')).toBe('20');
    expect(request.request.params.get('limit')).toBe('20');
    request.flush({
      messages: [],
      hasMoreBefore: false,
      nextBefore: null,
      hasMoreAfter: false,
      nextAfter: null,
    });
  });
});
