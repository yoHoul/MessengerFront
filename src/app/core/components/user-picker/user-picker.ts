import { Component, computed, input, output, signal } from '@angular/core';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { InputText } from '@openng/optimus-ui/inputtext';

import { User } from '../../type/user';

@Component({
  imports: [AvatarModule, InputText],
  selector: 'app-user-picker',
  styleUrl: './user-picker.scss',
  templateUrl: './user-picker.html',
})
export class UserPicker {
  readonly users = input.required<User[]>();

  readonly selectionChange = output<string[]>();

  protected readonly query = signal('');
  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());

  protected readonly filteredUsers = computed(() => {
    const query = this.query().trim().toLowerCase();

    if (!query) {
      return this.users();
    }

    return this.users().filter(
      (user) =>
        user.displayName.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query),
    );
  });

  protected isSelected(userId: string): boolean {
    return this.selectedIds().has(userId);
  }

  protected toggle(user: User): void {
    const selectedIds = new Set(this.selectedIds());

    if (selectedIds.has(user.id)) {
      selectedIds.delete(user.id);
    } else {
      selectedIds.add(user.id);
    }

    this.selectedIds.set(selectedIds);
    this.selectionChange.emit([...selectedIds]);
  }

  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected initials(user: User): string {
    return (
      user.displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || '?'
    );
  }
}
