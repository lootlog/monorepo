import { Test, type TestingModule } from "@nestjs/testing";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

jest.mock("uuid", () => ({
  v4: () => "mock-uuid",
}));

describe("NotificationsController", () => {
  let controller: NotificationsController;

  const mockNotificationsService = {
    cancelPartyGathering: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    jest.clearAllMocks();
  });

  describe("cancelPartyGathering", () => {
    const discordId = "123456";
    const notificationId = "notif-abc";

    it("should return 200 with guildIds on success", async () => {
      mockNotificationsService.cancelPartyGathering.mockResolvedValue({
        status: "success",
        guildIds: ["guild-1"],
      });

      const mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
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
      mockNotificationsService.cancelPartyGathering.mockResolvedValue({
        status: "expired",
      });

      const mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
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
