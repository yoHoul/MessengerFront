import { Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DialogModule } from '@openng/optimus-ui/dialog';

@Component({
  imports: [ButtonModule, DialogModule],
  selector: 'app-confirm-dialog',
  styleUrl: './confirm-dialog.scss',
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  readonly visible = input(false);
  readonly header = input('');
  readonly text = input('');
  readonly confirmLabel = input('Удалить');
  readonly dialogClass = input('');

  readonly visibleChange = output<boolean>();
  readonly confirmed = output<void>();
}
