import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { MessageAttachment } from '../type/message';
import { MockIdService } from './mock-id.service';

@Injectable({ providedIn: 'root' })
export class AttachmentsApiService {
  private readonly ids = inject(MockIdService);

  upload(files: File[]): Observable<MessageAttachment[]> {
    return of(
      files.map((file) => ({
        id: this.ids.next(),
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        isImage: file.type.startsWith('image/'),
      })),
    );
  }
}
