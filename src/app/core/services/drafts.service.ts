import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DraftsService {
  private readonly draftsState = signal<ReadonlyMap<string, string>>(new Map());

  readonly drafts = this.draftsState.asReadonly();

  getDraft(chatId: string): string {
    return this.draftsState().get(chatId) ?? '';
  }

  setDraft(chatId: string, text: string): void {
    const drafts = new Map(this.draftsState());

    if (text.trim()) {
      drafts.set(chatId, text);
    } else {
      drafts.delete(chatId);
    }

    this.draftsState.set(drafts);
  }

  clearDraft(chatId: string): void {
    if (!this.draftsState().has(chatId)) {
      return;
    }

    const drafts = new Map(this.draftsState());
    drafts.delete(chatId);
    this.draftsState.set(drafts);
  }
}
