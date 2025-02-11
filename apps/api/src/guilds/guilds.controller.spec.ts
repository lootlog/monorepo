import { Test, TestingModule } from '@nestjs/testing';
import { GuildsController } from './guilds.controller';

describe('GuildsController', () => {
  let controller: GuildsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuildsController],
    }).compile();

    controller = module.get<GuildsController>(GuildsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
