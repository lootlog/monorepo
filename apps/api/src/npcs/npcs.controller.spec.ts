import { Test, TestingModule } from '@nestjs/testing';
import { NpcsController } from './npcs.controller';

describe('NpcsController', () => {
  let controller: NpcsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NpcsController],
    }).compile();

    controller = module.get<NpcsController>(NpcsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
