import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BadgeModule } from '@openng/optimus-ui/badge';
import { ListboxModule } from '@openng/optimus-ui/listbox';

import { ChatListItem } from '../../type/chat-list-item';

@Component({
  imports: [BadgeModule, FormsModule, ListboxModule],
  selector: 'app-chat-menu',
  styleUrl: './chat-menu.scss',
  templateUrl: './chat-menu.html',
})
export class ChatMenu {
  readonly chats = input.required<ChatListItem[]>();
  readonly selectedChatId = input<string | null>(null);

  readonly chatSelected = output<string>();

  protected onSelectionChange(value: string | null): void {
    if (typeof value === 'string') {
      this.chatSelected.emit(value);
    }
  }
}
