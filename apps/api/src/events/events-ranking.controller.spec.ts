import { BadRequestException } from "@nestjs/common";
import { Permission } from "src/generated/prisma/client";
import { PERMISSIONS_KEY } from "src/shared/permissions/permissions.decorator";
import { EventsRankingController } from "./events-ranking.controller";

describe("EventsRankingController", () => {
  const mockEventsService = {
    getPendingParticipationConfirmations: vi.fn(),
    confirmParticipationForKill: vi.fn(),
    getEventOverview: vi.fn(),
    getRanking: vi.fn(),
    filterEventHeroesByLevel: vi.fn(),
    updateRankingPoints: vi.fn(),
    getRankingEditHistory: vi.fn(),
    getEventHeroTimers: vi.fn(),
    isHeroVisibleToUser: vi.fn(),
    getEventHeroStats: vi.fn(),
    getHeroWithAccessCheck: vi.fn(),
    getEventKillHistory: vi.fn(),
    getMemberKillHistory: vi.fn(),
    getHeroKillHistory: vi.fn(),
    getKillDetail: vi.fn(),
  };

  let controller: EventsRankingController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new EventsRankingController(mockEventsService as never);
  });

  it("declares permissions metadata for read/write/owner-admin endpoints", () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        EventsRankingController.prototype.getRanking,
      ),
    ).toEqual([Permission.LOOTLOG_EVENTS_READ]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        EventsRankingController.prototype.confirmParticipationForKill,
      ),
    ).toEqual([Permission.LOOTLOG_EVENTS_WRITE]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        EventsRankingController.prototype.updateRankingPoints,
      ),
    ).toEqual([Permission.OWNER, Permission.ADMIN]);
  });

  it("filters ranking rows to heroes visible after level gating", async () => {
    mockEventsService.getEventOverview.mockResolvedValue({
      heroNpcs: [{ npcName: "Visible Hero" }],
    });
    mockEventsService.getRanking.mockResolvedValue([
      { heroNpcName: "Visible Hero" },
      { heroNpcName: "Hidden Hero" },
    ]);
    mockEventsService.filterEventHeroesByLevel.mockReturnValue({
      heroNpcs: [{ npcName: "Visible Hero" }],
    });

    await expect(
      controller.getRanking({ id: "guild-1" }, "event-1", [] as never, [
        Permission.LOOTLOG_EVENTS_READ,
      ]),
    ).resolves.toEqual([{ heroNpcName: "Visible Hero" }]);
  });

  it("filters event hero timers by hero visibility", async () => {
    mockEventsService.getEventHeroTimers.mockResolvedValue([
      { npc: { lvl: 120 } },
      { npc: { lvl: 320 } },
    ]);
    mockEventsService.isHeroVisibleToUser
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    await expect(
      controller.getEventHeroTimers(
        { id: "guild-1" },
        "event-1",
        "berufs",
        [] as never,
        [Permission.LOOTLOG_TIMERS_READ],
      ),
    ).resolves.toEqual([{ npc: { lvl: 120 } }]);
  });

  it("rejects invalid member ids before fetching kill history", async () => {
    await expect(
      controller.getMemberKillHistory(
        { id: "guild-1" },
        "event-1",
        "not-a-number",
        undefined,
        undefined,
        undefined,
        [] as never,
        [Permission.LOOTLOG_EVENTS_READ],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
