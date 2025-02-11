import { Test, TestingModule } from '@nestjs/testing';
import { NpcsService } from './npcs.service';

describe('NpcsService', () => {
  let service: NpcsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NpcsService],
    }).compile();

    service = module.get<NpcsService>(NpcsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
