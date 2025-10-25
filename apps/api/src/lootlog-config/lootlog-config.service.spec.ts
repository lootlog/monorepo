import { Test, TestingModule } from '@nestjs/testing';
import { LootlogConfigService } from './lootlog-config.service';
import { PrismaService } from 'src/db/prisma.service';

describe('LootlogConfigService', () => {
  let service: LootlogConfigService;

  const mockPrismaService = {
    lootlogConfig: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    lootlogConfigNpc: {
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LootlogConfigService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LootlogConfigService>(LootlogConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
