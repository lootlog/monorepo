import { Test, TestingModule } from '@nestjs/testing';
import { LootlogConfigService } from './lootlog-config.service';

describe('LootlogConfigService', () => {
  let service: LootlogConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LootlogConfigService],
    }).compile();

    service = module.get<LootlogConfigService>(LootlogConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
