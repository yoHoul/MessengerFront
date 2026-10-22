import { TestBed } from '@angular/core/testing';

import { MockIdService } from './mock-id.service';

describe('MockIdService', () => {
  let service: MockIdService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockIdService);
  });

  it('returns unique digit-only identifiers', () => {
    const ids = Array.from({ length: 1000 }, () => service.next());

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^\d+$/.test(id))).toBe(true);
  });
});
