import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { ChatMenu } from '../../core/components/chat-menu/chat-menu';
import { ChatWindow } from '../../core/components/chat-window/chat-window';
import { SearchChat } from '../../core/components/search-chat/search-chat';
import { ChatsApiService } from '../../core/services/chats-api.service';

@Component({
  imports: [ChatMenu, ChatWindow, SearchChat],
  selector: 'app-main-page',
  styleUrl: './main-page.scss',
  templateUrl: './main-page.html',
})
export class MainPage {
  private readonly chatsApi = inject(ChatsApiService);

  protected readonly chats = toSignal(this.chatsApi.getChats(), {
    initialValue: [],
  });
}
