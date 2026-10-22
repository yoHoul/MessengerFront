import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { MessageAttachment } from '../type/message';
import { AttachmentsApi } from '../api/attachments-api';
import { MockIdService } from './mock-id.service';

@Injectable({ providedIn: 'root' })
export class AttachmentsApiService implements AttachmentsApi {
  private readonly ids = inject(MockIdService);
  private readonly references = new Map<string, number>();

  upload(files: File[]): Observable<MessageAttachment[]> {
    return of(
      files.map((file) => {
        const url = URL.createObjectURL(file);
        this.references.set(url, 1);

        return {
          id: this.ids.next(),
          name: file.name,
          type: file.type,
          size: file.size,
          url,
          isImage: file.type.startsWith('image/'),
        };
      }),
    );
  }

  retain(attachments: MessageAttachment[]): void {
    for (const attachment of attachments) {
      const count = this.references.get(attachment.url);

      if (count !== undefined) {
        this.references.set(attachment.url, count + 1);
      }
    }
  }

  release(attachments: MessageAttachment[]): void {
    for (const attachment of attachments) {
      if (!attachment.url.startsWith('blob:')) {
        continue;
      }

      const count = this.references.get(attachment.url);

      if (count === undefined) {
        URL.revokeObjectURL(attachment.url);
        continue;
      }

      if (count <= 1) {
        this.references.delete(attachment.url);
        URL.revokeObjectURL(attachment.url);
      } else {
        this.references.set(attachment.url, count - 1);
      }
    }
  }
}
