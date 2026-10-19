import { Component, input } from '@angular/core';

import { ChatListItem } from '../../type/chat-list-item';

@Component({
  imports: [],
  selector: 'app-chat-window',
  styleUrl: './chat-window.scss',
  templateUrl: './chat-window.html',
})
export class ChatWindow {
  readonly chat = input<ChatListItem | null>(null);
}
