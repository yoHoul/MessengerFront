import { Component, input, output } from '@angular/core';
import { IconField } from '@openng/optimus-ui/iconfield';
import { SearchIcon } from '@openng/optimus-ui/icons/search';
import { InputIcon } from '@openng/optimus-ui/inputicon';
import { InputText } from '@openng/optimus-ui/inputtext';

@Component({
  imports: [IconField, InputIcon, InputText, SearchIcon],
  selector: 'app-search-chat',
  styleUrl: './search-chat.scss',
  templateUrl: './search-chat.html',
})
export class SearchChat {
  readonly query = input('');

  readonly queryChange = output<string>();

  protected onInput(event: Event): void {
    this.queryChange.emit((event.target as HTMLInputElement).value);
  }

  protected clear(): void {
    this.queryChange.emit('');
  }
}
