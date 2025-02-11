import { Test, TestingModule } from '@nestjs/testing';
import { LootsController } from './loots.controller';

describe('LootsController', () => {
  let controller: LootsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LootsController],
    }).compile();

    controller = module.get<LootsController>(LootsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
