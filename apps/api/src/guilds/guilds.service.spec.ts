import { Test, TestingModule } from '@nestjs/testing';
import { GuildsService } from './guilds.service';

describe('GuildsService', () => {
  let service: GuildsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuildsService],
    }).compile();

    service = module.get<GuildsService>(GuildsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
