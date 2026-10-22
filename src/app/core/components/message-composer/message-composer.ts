import { Component, input, output } from '@angular/core';
import { ButtonModule } from '@openng/optimus-ui/button';
import { Textarea } from '@openng/optimus-ui/textarea';

import { Message, MessageAttachment } from '../../type/message';

@Component({
  imports: [ButtonModule, Textarea],
  selector: 'app-message-composer',
  styleUrl: './message-composer.scss',
  templateUrl: './message-composer.html',
})
export class MessageComposer {
  readonly draft = input('');
  readonly pendingAttachments = input<MessageAttachment[]>([]);
  readonly replyTo = input<Message | null>(null);
  readonly replyAuthorName = input('');
  readonly replyText = input('');
  readonly isSending = input(false);
  readonly isUploading = input(false);

  readonly draftChange = output<string>();
  readonly send = output<void>();
  readonly filesSelected = output<File[]>();
  readonly removeAttachment = output<MessageAttachment>();
  readonly cancelReply = output<void>();

  protected onInput(event: Event): void {
    this.draftChange.emit((event.target as HTMLTextAreaElement).value);
  }

  protected onEnter(event: Event): void {
    if ((event as KeyboardEvent).shiftKey) {
      return;
    }

    event.preventDefault();
    this.send.emit();
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (files.length > 0) {
      this.filesSelected.emit(files);
    }
  }
}
