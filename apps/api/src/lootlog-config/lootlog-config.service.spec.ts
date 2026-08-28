import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { LootlogConfigService } from "./lootlog-config.service";
import { PrismaService } from "src/db/prisma.service";
import { createPrismaServiceTestDouble } from "src/test/prisma-service-test-double";

describe("LootlogConfigService", () => {
  let service: LootlogConfigService;

  const mockPrismaService = createPrismaServiceTestDouble({
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
  });

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
