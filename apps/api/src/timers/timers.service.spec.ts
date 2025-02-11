import { Test, TestingModule } from '@nestjs/testing';
import { TimersService } from './timers.service';

describe('TimersService', () => {
  let service: TimersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimersService],
    }).compile();

    service = module.get<TimersService>(TimersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
