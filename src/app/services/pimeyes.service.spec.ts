import { TestBed } from '@angular/core/testing';

import { PimeyesService } from './pimeyes.service';

describe('PimeyesService', () => {
  let service: PimeyesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PimeyesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
