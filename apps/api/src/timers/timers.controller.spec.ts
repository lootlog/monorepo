import { Test, TestingModule } from '@nestjs/testing';
import { TimersController } from './timers.controller';

describe('TimersController', () => {
  let controller: TimersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimersController],
    }).compile();

    controller = module.get<TimersController>(TimersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
