import { Component, input, output } from '@angular/core';
import { BadgeModule } from '@openng/optimus-ui/badge';
import { ListboxModule } from '@openng/optimus-ui/listbox';
import type { ListboxChangeEvent } from '@openng/optimus-ui/types/listbox';

import { ChatListItem } from '../../type/chat-list-item';

@Component({
  imports: [BadgeModule, ListboxModule],
  selector: 'app-chat-menu',
  styleUrl: './chat-menu.scss',
  templateUrl: './chat-menu.html',
})
export class ChatMenu {
  readonly chats = input.required<ChatListItem[]>();
  readonly selectedChatId = output<string>();

  protected onSelectionChange(event: ListboxChangeEvent): void {
    if (typeof event.value === 'string') {
      this.selectedChatId.emit(event.value);
    }
  }
}
