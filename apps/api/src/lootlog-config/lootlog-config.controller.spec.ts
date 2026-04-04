import { Test, type TestingModule } from "@nestjs/testing";
import { LootlogConfigController } from "./lootlog-config.controller";
import { LootlogConfigService } from "./lootlog-config.service";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";

describe("LootlogConfigController", () => {
  let controller: LootlogConfigController;

  const mockLootlogConfigService = {
    getLootlogConfig: vi.fn(),
    updateNpc: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LootlogConfigController],
      providers: [
        {
          provide: LootlogConfigService,
          useValue: mockLootlogConfigService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LootlogConfigController>(LootlogConfigController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
