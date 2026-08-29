import { Test, type TestingModule } from "@nestjs/testing";
import type { Mock } from "vitest";
import { Permission, NpcType, type Role } from "#src/generated/prisma/client";
import { AuthGuard } from "@lootlog/nest-shared";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";
import { mockFn } from "#src/test/mock-fn";
import type { CreateKillDto } from "./dto/create-kill.dto.js";
import {
  GetGuildKillStatsDto,
  GetUserKillStatsDto,
} from "./dto/get-kill-stats.dto.js";
import { KillsController } from "./kills.controller.js";
import { KillsService } from "./kills.service.js";

describe("KillsController", () => {
  let controller: KillsController;
  let service: {
    createKill: Mock;
    getGuildKillStats: Mock;
    getUserKillStats: Mock;
  };

  const mockRole: Role = {
    id: "role1",
    name: "Test Role",
    color: 16711680,
    position: 1,
    permissions: [Permission.LOOTLOG_LOOTS_READ],
    lvlRangeFrom: 1,
    lvlRangeTo: 500,
    guildId: "guild1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateKillDto: CreateKillDto = {
    world: "pandora",
    npc: {
      id: -12345,
      name: "Test Boss",
      lvl: 300,
      prof: "w",
      wt: 85,
      icon: "boss.gif",
    },
    characterId: "67890",
    accountId: "11111",
  };

  beforeEach(async () => {
    const mockKillsService = {
      createKill: mockFn(),
      getGuildKillStats: mockFn(),
      getUserKillStats: mockFn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KillsController],
      providers: [{ provide: KillsService, useValue: mockKillsService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<KillsController>(KillsController);
    service = module.get(KillsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should be defined", () => {
      expect(controller).toBeDefined();
    });
  });

  describe("createKill", () => {
    const discordId = "discord123";

    it("should create a kill and return the result", async () => {
      const mockResult = { updated: 2 };
      service.createKill.mockResolvedValue(mockResult);

      const result = await controller.createKill(mockCreateKillDto, discordId);

      expect(service.createKill).toHaveBeenCalledWith(
        discordId,
        mockCreateKillDto,
      );
      expect(result).toEqual(mockResult);
    });

    it("should return updated: 0 when no guilds are configured", async () => {
      const mockResult = { updated: 0 };
      service.createKill.mockResolvedValue(mockResult);

      const result = await controller.createKill(mockCreateKillDto, discordId);

      expect(result).toEqual(mockResult);
    });

    it("should handle service errors", async () => {
      service.createKill.mockRejectedValue(new Error("Database error"));

      await expect(
        controller.createKill(mockCreateKillDto, discordId),
      ).rejects.toThrow("Database error");
    });
  });

  describe("getGuildKillStats", () => {
    const guildId = "guild123";
    const mockGuildData = { id: guildId } as { id: string };
    const permissions = [Permission.LOOTLOG_LOOTS_READ];
    const roles = [mockRole];

    it("should fetch guild kill stats", async () => {
      const mockStats = {
        overview: {
          guildUniqueKills: 100,
          totalMemberParticipations: 150,
          killsByType: {
            [NpcType.HERO]: 50,
            [NpcType.TITAN]: 30,
            [NpcType.ELITE3]: 20,
          },
          participationsByType: {
            [NpcType.HERO]: 80,
            [NpcType.TITAN]: 40,
            [NpcType.ELITE3]: 30,
          },
        },
        memberRanking: [
          {
            memberId: 1,
            memberName: "Player1",
            memberAvatar: null,
            memberUserId: "user1",
            totalParticipations: 90,
            participationsByType: {
              [NpcType.HERO]: 50,
              [NpcType.TITAN]: 25,
              [NpcType.ELITE3]: 15,
            },
          },
          {
            memberId: 2,
            memberName: "Player2",
            memberAvatar: null,
            memberUserId: "user2",
            totalParticipations: 60,
            participationsByType: {
              [NpcType.HERO]: 30,
              [NpcType.TITAN]: 15,
              [NpcType.ELITE3]: 15,
            },
          },
        ],
      };
      service.getGuildKillStats.mockResolvedValue(mockStats);

      const query = new GetGuildKillStatsDto();
      const result = await controller.getGuildKillStats(
        permissions,
        roles,
        query,
        mockGuildData,
      );

      expect(service.getGuildKillStats).toHaveBeenCalledWith(
        guildId,
        permissions,
        roles,
        query,
      );
      expect(result).toEqual(mockStats);
    });

    it("should handle empty results", async () => {
      const mockStats = {
        overview: {
          guildUniqueKills: 0,
          totalMemberParticipations: 0,
          killsByType: {},
          participationsByType: {},
        },
        memberRanking: [],
      };
      service.getGuildKillStats.mockResolvedValue(mockStats);

      const query = new GetGuildKillStatsDto();
      const result = await controller.getGuildKillStats(
        permissions,
        roles,
        query,
        mockGuildData,
      );

      expect(result).toEqual(mockStats);
    });

    it("should pass query filters to service", async () => {
      const mockStats = {
        overview: {
          guildUniqueKills: 10,
          totalMemberParticipations: 15,
          killsByType: { [NpcType.TITAN]: 10 },
          participationsByType: { [NpcType.TITAN]: 15 },
        },
        memberRanking: [],
      };
      service.getGuildKillStats.mockResolvedValue(mockStats);

      const query = new GetGuildKillStatsDto();
      query.npcTypes = [NpcType.TITAN];
      query.minLvl = 200;
      query.maxLvl = 400;

      await controller.getGuildKillStats(
        permissions,
        roles,
        query,
        mockGuildData,
      );

      expect(service.getGuildKillStats).toHaveBeenCalledWith(
        guildId,
        permissions,
        roles,
        query,
      );
    });
  });

  describe("getUserKillStats", () => {
    const discordId = "discord123";

    it("should fetch user kill stats", async () => {
      const mockStats = {
        overview: {
          totalKills: 200,
          killsByType: {
            [NpcType.HERO]: 100,
            [NpcType.TITAN]: 50,
            [NpcType.ELITE3]: 50,
          },
          killsByWorld: { pandora: 150, tempest: 50 },
        },
        topNpcs: [
          {
            npcId: 999,
            npcName: "Popular Boss",
            npcType: NpcType.HERO,
            npcLvl: 300,
            npcProf: null,
            npcIcon: "boss.gif",
            totalKills: 25,
          },
        ],
      };
      service.getUserKillStats.mockResolvedValue(mockStats);

      const query = new GetUserKillStatsDto();
      const result = await controller.getUserKillStats(discordId, query);

      expect(service.getUserKillStats).toHaveBeenCalledWith(discordId, query);
      expect(result).toEqual(mockStats);
    });

    it("should handle empty user stats", async () => {
      const mockStats = {
        overview: {
          totalKills: 0,
          killsByType: {},
          killsByWorld: {},
        },
        topNpcs: [],
      };
      service.getUserKillStats.mockResolvedValue(mockStats);

      const query = new GetUserKillStatsDto();
      const result = await controller.getUserKillStats(discordId, query);

      expect(result).toEqual(mockStats);
    });

    it("should pass query filters to service", async () => {
      const mockStats = {
        overview: { totalKills: 0, killsByType: {}, killsByWorld: {} },
        topNpcs: [],
      };
      service.getUserKillStats.mockResolvedValue(mockStats);

      const query = new GetUserKillStatsDto();
      query.world = "pandora";
      query.npcTypes = [NpcType.HERO, NpcType.TITAN];

      await controller.getUserKillStats(discordId, query);

      expect(service.getUserKillStats).toHaveBeenCalledWith(discordId, query);
    });
  });
});
