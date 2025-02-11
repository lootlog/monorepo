import { Test, TestingModule } from '@nestjs/testing';
import { LootlogConfigController } from './lootlog-config.controller';

describe('LootlogConfigController', () => {
  let controller: LootlogConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LootlogConfigController],
    }).compile();

    controller = module.get<LootlogConfigController>(LootlogConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
