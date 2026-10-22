import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MockIdService {
  private sequence = 0;

  next(): string {
    const suffix = String(this.sequence++ % 1000).padStart(3, '0');
    return `${Date.now()}${suffix}`;
  }
}
