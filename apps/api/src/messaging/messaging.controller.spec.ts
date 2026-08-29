import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { MessagingController } from "./messaging.controller.js";
import { MessagingService } from "./messaging.service.js";

vi.mock("uuid", () => ({
  v4: () => "mock-uuid",
}));

describe("MessagingController", () => {
  let controller: MessagingController;

  const mockMessagingService = {
    sendNotification: mockFn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagingController],
      providers: [
        {
          provide: MessagingService,
          useValue: mockMessagingService,
        },
      ],
    }).compile();

    controller = module.get<MessagingController>(MessagingController);
    vi.clearAllMocks();
  });

  it("delegates ordinary notifications to MessagingService", async () => {
    const data = { guildIds: ["guild-1"], message: "message" };
    mockMessagingService.sendNotification.mockResolvedValue({
      notificationId: "notification-1",
      guildIds: ["guild-1"],
    });

    await expect(
      controller.sendNotification("discord-1", data),
    ).resolves.toMatchObject({ notificationId: "notification-1" });
    expect(mockMessagingService.sendNotification).toHaveBeenCalledWith(
      "discord-1",
      data,
    );
  });
});
