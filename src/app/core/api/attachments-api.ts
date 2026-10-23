import { Observable } from 'rxjs';

import { MessageAttachment } from '../type/message';

export abstract class AttachmentsApi {
  abstract upload(files: File[]): Observable<MessageAttachment[]>;
  abstract retain(attachments: MessageAttachment[]): void;
  abstract release(attachments: MessageAttachment[]): void;
}
