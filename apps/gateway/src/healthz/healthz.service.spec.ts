import { Test, TestingModule } from '@nestjs/testing';
import { HealthzService } from './healthz.service';

describe('HealthzService', () => {
  let service: HealthzService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthzService],
    }).compile();

    service = module.get<HealthzService>(HealthzService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
