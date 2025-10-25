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

  describe('healthCheck', () => {
    it('should return OK string', () => {
      const result = service.healthCheck();
      expect(result).toBe('OK');
    });

    it('should return a string', () => {
      const result = service.healthCheck();
      expect(typeof result).toBe('string');
    });
  });
});
