import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';

import { AttachmentsApi } from '../attachments-api';
import { API_CONFIG } from '../api-config';
import { MessageAttachment } from '../../type/message';

@Injectable({ providedIn: 'root' })
export class HttpAttachmentsApiService implements AttachmentsApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  upload(files: File[]): Observable<MessageAttachment[]> {
    if (files.length === 0) {
      return of([]);
    }

    return forkJoin(
      files.map((file) => {
        const body = new FormData();
        body.append('file', file);

        return this.http.post<MessageAttachment>(
          this.url('/attachments'),
          body,
        );
      }),
    );
  }

  retain(_attachments: MessageAttachment[]): void {
    // Постоянные URL принадлежат серверу.
  }

  release(_attachments: MessageAttachment[]): void {
    // Удаление файлов выполняет сервер.
  }

  private url(path: string): string {
    return `${this.config.baseUrl.replace(/\/$/, '')}${path}`;
  }
}
