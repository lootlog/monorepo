import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { LootlogConfigService } from "./lootlog-config.service";
import { PrismaService } from "src/db/prisma.service";

describe("LootlogConfigService", () => {
  let service: LootlogConfigService;

  const mockPrismaService = {
    lootlogConfig: {
      findUnique: mockFn(),
      findMany: mockFn(),
      create: mockFn(),
      update: mockFn(),
    },
    lootlogConfigNpc: {
      upsert: mockFn(),
      delete: mockFn(),
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
