import { Test, type TestingModule } from "@nestjs/testing";
import { LootlogConfigService } from "./lootlog-config.service";
import { PrismaService } from "src/db/prisma.service";

describe("LootlogConfigService", () => {
  let service: LootlogConfigService;

  const mockPrismaService = {
    lootlogConfig: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    lootlogConfigNpc: {
      upsert: vi.fn(),
      delete: vi.fn(),
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

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
