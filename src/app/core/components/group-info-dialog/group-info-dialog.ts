import { Component, computed, input, output } from '@angular/core';
import { AvatarModule } from '@openng/optimus-ui/avatar';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';
import { InputText } from '@openng/optimus-ui/inputtext';

import { User } from '../../type/user';

@Component({
  imports: [AvatarModule, ButtonModule, DialogModule, InputText],
  selector: 'app-group-info-dialog',
  styleUrl: './group-info-dialog.scss',
  templateUrl: './group-info-dialog.html',
})
export class GroupInfoDialog {
  readonly visible = input(false);
  readonly title = input('');
  readonly members = input<User[]>([]);
  readonly error = input('');
  readonly owner = input(false);
  readonly loading = input(false);
  readonly editing = input(false);
  readonly titleDraft = input('');
  readonly currentUserId = input<string | null>(null);
  readonly ownerId = input<string | null>(null);
  readonly canRename = input(false);

  readonly visibleChange = output<boolean>();
  readonly startRename = output<void>();
  readonly cancelRename = output<void>();
  readonly titleInput = output<string>();
  readonly rename = output<void>();
  readonly addMembers = output<void>();
  readonly deleteGroup = output<void>();
  readonly removeMember = output<User>();
  readonly directChat = output<User>();

  protected readonly initials = computed(() =>
    this.getInitials(this.title()),
  );

  protected readonly memberCountLabel = computed(() => {
    const count = this.members().length;
    const mod100 = count % 100;
    const mod10 = count % 10;

    let word = 'участников';

    if (mod100 < 11 || mod100 > 14) {
      if (mod10 === 1) {
        word = 'участник';
      } else if (mod10 >= 2 && mod10 <= 4) {
        word = 'участника';
      }
    }

    return `${count} ${word}`;
  });

  protected memberName(member: User): string {
    let name = member.displayName;

    if (member.id === this.currentUserId()) {
      name += ' (Вы)';
    }

    if (member.id === this.ownerId()) {
      name += ' (Администратор группы)';
    }

    return name;
  }

  protected memberInitials(member: User): string {
    return this.getInitials(member.displayName);
  }

  protected onTitleInput(event: Event): void {
    this.titleInput.emit((event.target as HTMLInputElement).value);
  }

  private getInitials(value: string): string {
    return (
      value
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || '?'
    );
  }
}
