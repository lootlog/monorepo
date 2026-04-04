import { Test, type TestingModule } from "@nestjs/testing";
import { MessagingController } from "./messaging.controller";
import { MessagingService } from "./messaging.service";

vi.mock("uuid", () => ({
  v4: () => "mock-uuid",
}));

describe("MessagingController", () => {
  let controller: MessagingController;

  const mockMessagingService = {
    cancelPartyGathering: vi.fn(),
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

  describe("cancelPartyGathering", () => {
    const discordId = "123456";
    const notificationId = "notif-abc";

    it("should return 200 with guildIds on success", async () => {
      mockMessagingService.cancelPartyGathering.mockResolvedValue({
        status: "success",
        guildIds: ["guild-1"],
      });

      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      };

      await controller.cancelPartyGathering(
        discordId,
        notificationId,
        mockReply as any,
      );

      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        guildIds: ["guild-1"],
      });
    });

    it("should return 204 with empty body for expired notification", async () => {
      mockMessagingService.cancelPartyGathering.mockResolvedValue({
        status: "expired",
      });

      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      };

      await controller.cancelPartyGathering(
        discordId,
        notificationId,
        mockReply as any,
      );

      expect(mockReply.status).toHaveBeenCalledWith(204);
      expect(mockReply.send).toHaveBeenCalledWith();
    });
  });
});
