import { Test, type TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import { mockFn } from "src/test/mock-fn";
import { PrismaService } from "src/db/prisma.service";
import { EVENT_HERO_KILL_QUEUE } from "../constants/event-hero-kill-queue.constant";
import { EventTimerHooksService } from "./event-timer-hooks.service";
import { createPrismaServiceTestDouble } from "src/test/prisma-service-test-double";

describe("EventTimerHooksService", () => {
  let service: EventTimerHooksService;

  const mockPrismaService = createPrismaServiceTestDouble({
    eventHeroNpc: {
      findMany: mockFn(),
    },
  });

  const mockQueue = {
    add: mockFn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventTimerHooksService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: getQueueToken(EVENT_HERO_KILL_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<EventTimerHooksService>(EventTimerHooksService);
  });

  describe("findActiveEventHeroByNpc", () => {
    const guildId = "guild-1";
    const world = "tempest";
    const npcId = 123;
    const npcName = "Test Hero";

    it("should find hero by exact npcName when stored npcId is incorrect", async () => {
      const hero = {
        id: "hero-1",
        npcId: 999,
        npcName,
        event: { id: "event-1", guildId, world, createdAt: new Date() },
      };

      mockPrismaService.eventHeroNpc.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([hero]);

      const result = await service.findActiveEventHeroByNpc(
        guildId,
        world,
        npcId,
        npcName,
      );

      expect(result).not.toBeNull();
      expect(result?.eventHero.id).toBe("hero-1");
      expect(result?.eventHero.npcId).toBe(999);
    });

    it("should return newest active hero when multiple exact name matches exist", async () => {
      const olderHero = {
        id: "hero-1",
        npcId: 999,
        npcName,
        event: {
          id: "event-1",
          guildId,
          world,
          startsAt: new Date("2026-01-01T10:00:00.000Z"),
          createdAt: new Date("2026-01-01T09:00:00.000Z"),
        },
      };
      const newerHero = {
        id: "hero-2",
        npcId: 555,
        npcName,
        event: {
          id: "event-2",
          guildId,
          world,
          startsAt: new Date("2026-01-02T10:00:00.000Z"),
          createdAt: new Date("2026-01-02T09:00:00.000Z"),
        },
      };

      mockPrismaService.eventHeroNpc.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([olderHero, newerHero]);

      const result = await service.findActiveEventHeroByNpc(
        guildId,
        world,
        npcId,
        npcName,
      );

      expect(result?.eventHero.id).toBe("hero-2");
    });

    it("should deduplicate hero matched by both npcId and npcName", async () => {
      const hero = {
        id: "hero-1",
        npcId,
        npcName,
        event: {
          id: "event-1",
          guildId,
          world,
          startsAt: new Date("2026-01-01T10:00:00.000Z"),
          createdAt: new Date("2026-01-01T09:00:00.000Z"),
        },
      };

      mockPrismaService.eventHeroNpc.findMany
        .mockResolvedValueOnce([hero])
        .mockResolvedValueOnce([hero]);

      const result = await service.findActiveEventHeroByNpc(
        guildId,
        world,
        npcId,
        npcName,
      );

      expect(result?.eventHero.id).toBe("hero-1");
      expect(mockPrismaService.eventHeroNpc.findMany).toHaveBeenCalledTimes(2);
    });
  });
});
