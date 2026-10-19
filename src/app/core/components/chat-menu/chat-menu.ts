import { Component, input } from '@angular/core';
import { ListboxModule } from '@openng/optimus-ui/listbox';

import { Chat } from '../../services/chats-api.service';

@Component({
  imports: [ListboxModule],
  selector: 'app-chat-menu',
  styleUrl: './chat-menu.scss',
  templateUrl: './chat-menu.html',
})
export class ChatMenu {
  readonly chats = input.required<Chat[]>();
}
