import { Test, TestingModule } from '@nestjs/testing';
import { LootsService } from './loots.service';

describe('LootsService', () => {
  let service: LootsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LootsService],
    }).compile();

    service = module.get<LootsService>(LootsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
