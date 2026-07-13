import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { EventModeQueryDto } from "./dto/event-mode-query.dto";
import { EventModeController } from "./event-mode.controller";
import { EventModeService } from "./services/event-mode.service";

describe("EventModeController", () => {
  const mockEventModeService = {
    getEventMode: mockFn(),
  };
  let controller: EventModeController;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventModeController],
      providers: [
        {
          provide: EventModeService,
          useValue: mockEventModeService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(EventModeController);
  });

  it("delegates with both authenticated identities", async () => {
    mockEventModeService.getEventMode.mockResolvedValue({
      generatedAt: new Date("2026-07-13T12:00:00.000Z"),
      events: [],
    });

    await controller.getEventMode("user-1", "discord-1", {
      world: "Tempest",
    });

    expect(mockEventModeService.getEventMode).toHaveBeenCalledWith({
      userId: "user-1",
      discordId: "discord-1",
      world: "Tempest",
      devPermissionOverride: undefined,
    });
  });

  it("rejects a missing or blank world in the query schema", () => {
    expect(EventModeQueryDto.schema.safeParse({}).success).toBe(false);
    expect(EventModeQueryDto.schema.safeParse({ world: "   " }).success).toBe(
      false,
    );
    expect(
      EventModeQueryDto.schema.safeParse({ world: "  Tempest  " }),
    ).toEqual(
      expect.objectContaining({
        success: true,
        data: { world: "Tempest" },
      }),
    );
  });
});
