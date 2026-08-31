import { Test, TestingModule } from "@nestjs/testing";
import { AuthGuard } from "@lootlog/nest-shared";
import { ActivitySource, ActivityType } from "../shared/db/domain.js";
import { PermissionsGuard } from "#src/shared/guards/permissions.guard";
import { ActivitiesController } from "./activities.controller.js";
import { QueryActivitiesDto } from "./dto/query-activities.dto.js";
import { ActivitiesService } from "./activities.service.js";
import { ActivitiesQueryService } from "./services/activities-query.service.js";

describe("ActivitiesController", () => {
  let controller: ActivitiesController;
  let queryService: ActivitiesQueryService;
  let service: ActivitiesService;

  const mockActivity = {
    id: "activity-1",
    userId: "user-1",
    guildId: "guild-1",
    discordId: "discord-1",
    type: ActivityType.CONNECT_EVENT,
    source: ActivitySource.WEB_APP,
    createdAt: new Date("2024-01-01"),
    details: { itemName: "Sword" },
  };

  const mockPaginatedResponse = {
    data: [mockActivity],
    nextCursor: "cursor-1",
    hasMore: false,
  };

  const mockQueryService = {
    findByGuild: vi.fn(),
    findByUser: vi.fn(),
    findOne: vi.fn(),
    findMemberActivityStatsByGuild: vi.fn(),
  };

  const mockService = {
    deleteOne: vi.fn(),
  };

  const mockAuthGuard = {
    canActivate: vi.fn(() => true),
  };

  const mockPermissionsGuard = {
    canActivate: vi.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        {
          provide: ActivitiesService,
          useValue: mockService,
        },
        {
          provide: ActivitiesQueryService,
          useValue: mockQueryService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockPermissionsGuard)
      .compile();

    controller = module.get<ActivitiesController>(ActivitiesController);
    queryService = module.get<ActivitiesQueryService>(ActivitiesQueryService);
    service = module.get<ActivitiesService>(ActivitiesService);

    vi.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findByGuild", () => {
    it("should return paginated activities for a guild", async () => {
      const guildId = "guild-1";
      const query: QueryActivitiesDto = { limit: 50 };

      mockQueryService.findByGuild.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findByGuild(guildId, query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(queryService.findByGuild).toHaveBeenCalledWith(guildId, query);
      expect(queryService.findByGuild).toHaveBeenCalledTimes(1);
    });

    it("should pass query parameters to service", async () => {
      const guildId = "guild-1";
      const query: QueryActivitiesDto = {
        type: [ActivityType.CONNECT_EVENT],
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-12-31T23:59:59Z",
        cursor: "cursor-1",
        limit: 25,
      };

      mockQueryService.findByGuild.mockResolvedValue(mockPaginatedResponse);

      await controller.findByGuild(guildId, query);

      expect(queryService.findByGuild).toHaveBeenCalledWith(guildId, query);
    });
  });

  describe("findByUser", () => {
    it("should return paginated activities for a user", async () => {
      const guildId = "guild-1";
      const userId = "user-1";
      const query: QueryActivitiesDto = { limit: 50 };

      mockQueryService.findByUser.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findByUser(guildId, userId, query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(queryService.findByUser).toHaveBeenCalledWith(
        userId,
        guildId,
        query,
      );
      expect(queryService.findByUser).toHaveBeenCalledTimes(1);
    });

    it("should pass query parameters to service", async () => {
      const guildId = "guild-1";
      const userId = "user-1";
      const query: QueryActivitiesDto = {
        type: [ActivityType.DISCONNECT_EVENT],
        limit: 100,
      };

      mockQueryService.findByUser.mockResolvedValue(mockPaginatedResponse);

      await controller.findByUser(guildId, userId, query);

      expect(queryService.findByUser).toHaveBeenCalledWith(
        userId,
        guildId,
        query,
      );
    });
  });

  describe("findOne", () => {
    it("should return a single activity by ID", async () => {
      const guildId = "guild-1";
      const activityId = "activity-1";

      mockQueryService.findOne.mockResolvedValue(mockActivity);

      const result = await controller.findOne(guildId, activityId);

      expect(result).toEqual(mockActivity);
      expect(queryService.findOne).toHaveBeenCalledWith(activityId, guildId);
      expect(queryService.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe("getMemberActivityStats", () => {
    it("should return member activity stats for all sources in a guild", async () => {
      const guildId = "guild-1";
      const stats = [
        {
          guildId,
          discordId: "discord-1",
          source: ActivitySource.WEB_APP,
          lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
          visitCount: 3,
          activeSessionCount: 1,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        {
          guildId,
          discordId: "discord-1",
          source: ActivitySource.GAME,
          lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
          visitCount: 7,
          activeSessionCount: 2,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ];

      mockQueryService.findMemberActivityStatsByGuild.mockResolvedValue(stats);

      const result = await controller.getMemberActivityStats(guildId);

      expect(result).toEqual(stats);
      expect(queryService.findMemberActivityStatsByGuild).toHaveBeenCalledWith(
        guildId,
      );
    });
  });

  describe("deleteActivity", () => {
    it("should delete a specific activity by ID", async () => {
      const guildId = "guild-1";
      const activityId = "activity-1";
      const expectedCount = 1;

      mockService.deleteOne.mockResolvedValue(expectedCount);

      const result = await controller.deleteActivity(guildId, activityId);

      expect(result).toEqual({ count: expectedCount });
      expect(service.deleteOne).toHaveBeenCalledWith(activityId, guildId);
      expect(service.deleteOne).toHaveBeenCalledTimes(1);
    });
  });

  describe("endpoint restrictions", () => {
    it("should not have a findAll method that allows fetching all activities", () => {
      expect("findAll" in controller).toBe(false);
    });
  });
});
