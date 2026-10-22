import { Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';

import { User } from '../../type/user';
import { UserPicker } from '../user-picker/user-picker';

@Component({
  imports: [ButtonModule, DialogModule, UserPicker],
  selector: 'app-add-members-dialog',
  styleUrl: './add-members-dialog.scss',
  templateUrl: './add-members-dialog.html',
})
export class AddMembersDialog {
  readonly visible = input(false);
  readonly loading = input(false);
  readonly users = input<User[]>([]);
  readonly error = input('');
  readonly selectedCount = input(0);

  readonly visibleChange = output<boolean>();
  readonly selectionChange = output<string[]>();
  readonly add = output<void>();
}
