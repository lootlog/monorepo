import { Test, TestingModule } from '@nestjs/testing';
import { BattlesService } from './battles.service';

describe('BattlesService', () => {
  let service: BattlesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BattlesService],
    }).compile();

    service = module.get<BattlesService>(BattlesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
