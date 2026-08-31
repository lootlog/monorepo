import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { LootlogConfigService } from "./lootlog-config.service.js";
import { POSTGRES_POOL } from "#src/db/prisma.provider";

describe("LootlogConfigService", () => {
  let service: LootlogConfigService;

  const mockPostgres = { query: mockFn(), connect: mockFn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LootlogConfigService,
        {
          provide: POSTGRES_POOL,
          useValue: mockPostgres,
        },
      ],
    }).compile();

    service = module.get<LootlogConfigService>(LootlogConfigService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
