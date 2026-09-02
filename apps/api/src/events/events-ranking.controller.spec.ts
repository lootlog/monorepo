import { BadRequestException } from "@nestjs/common";
import { Permission } from "@lootlog/schema/permissions";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { REQUIRED_CAPABILITIES_KEY } from "@lootlog/nest-shared";
import { EventsRankingController } from "./events-ranking.controller.js";

describe("EventsRankingController", () => {
  const mockEventsService = {
    getPendingParticipationConfirmations: vi.fn(),
    acknowledgeExpiredParticipationConfirmations: vi.fn(),
    confirmParticipationForKill: vi.fn(),
    getEventOverview: vi.fn(),
    getRanking: vi.fn(),
    getRankingEditHistories: vi.fn(),
    filterEventHeroesByLevel: vi.fn(),
    updateRankingPoints: vi.fn(),
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
        REQUIRED_CAPABILITIES_KEY,
        EventsRankingController.prototype.getRanking,
      ),
    ).toEqual([Permission.LOOTLOG_EVENTS_READ]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        EventsRankingController.prototype.confirmParticipationForKill,
      ),
    ).toEqual([Permission.LOOTLOG_EVENTS_WRITE]);
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        EventsRankingController.prototype.updateRankingPoints,
      ),
    ).toEqual([Permission.OWNER, Permission.ADMIN]);
  });

  it("filters ranking rows to heroes visible after level gating", async () => {
    mockEventsService.getEventOverview.mockResolvedValue({
      heroNpcs: [{ npcName: "Visible Hero" }],
    });
    mockEventsService.getRanking.mockResolvedValue([
      { id: "ranking-1", heroNpcName: "Visible Hero" },
      { id: "ranking-2", heroNpcName: "Hidden Hero" },
    ]);
    mockEventsService.filterEventHeroesByLevel.mockReturnValue({
      heroNpcs: [{ npcName: "Visible Hero" }],
    });

    await expect(
      controller.getRanking(
        { id: "guild-1" },
        "event-1",
        [] as never,
        createAccessPolicy({
          capabilities: [Permission.LOOTLOG_EVENTS_READ],
        }),
      ),
    ).resolves.toEqual([
      {
        id: "ranking-1",
        heroNpcName: "Visible Hero",
        editHistory: [],
      },
    ]);
    expect(mockEventsService.getRankingEditHistories).not.toHaveBeenCalled();
  });

  it("attaches bulk edit histories for owners after hero filtering", async () => {
    mockEventsService.getEventOverview.mockResolvedValue({
      heroNpcs: [{ npcName: "Visible Hero" }],
    });
    mockEventsService.getRanking.mockResolvedValue([
      { id: "ranking-1", heroNpcName: "Visible Hero" },
      { id: "ranking-2", heroNpcName: "Hidden Hero" },
    ]);
    mockEventsService.filterEventHeroesByLevel.mockReturnValue({
      heroNpcs: [{ npcName: "Visible Hero" }],
    });
    mockEventsService.getRankingEditHistories.mockResolvedValue(
      new Map([
        [
          "ranking-1",
          [
            {
              id: "history-1",
              rankingId: "ranking-1",
            },
          ],
        ],
      ]),
    );

    await expect(
      controller.getRanking(
        { id: "guild-1" },
        "event-1",
        [] as never,
        createAccessPolicy({ capabilities: [Permission.OWNER] }),
      ),
    ).resolves.toEqual([
      {
        id: "ranking-1",
        heroNpcName: "Visible Hero",
        editHistory: [
          {
            id: "history-1",
            rankingId: "ranking-1",
          },
        ],
      },
    ]);
    expect(mockEventsService.getRankingEditHistories).toHaveBeenCalledWith(
      "guild-1",
      "event-1",
      ["ranking-1"],
    );
  });

  it("skips edit history queries when no ranking rows are visible", async () => {
    mockEventsService.getEventOverview.mockResolvedValue({
      heroNpcs: [{ npcName: "Visible Hero" }],
    });
    mockEventsService.getRanking.mockResolvedValue([
      { id: "ranking-1", heroNpcName: "Hidden Hero" },
    ]);
    mockEventsService.filterEventHeroesByLevel.mockReturnValue({
      heroNpcs: [{ npcName: "Visible Hero" }],
    });

    await expect(
      controller.getRanking(
        { id: "guild-1" },
        "event-1",
        [] as never,
        createAccessPolicy({ capabilities: [Permission.OWNER] }),
      ),
    ).resolves.toEqual([]);
    expect(mockEventsService.getRankingEditHistories).not.toHaveBeenCalled();
  });

  it("acknowledges expired confirmations for the current guild member", async () => {
    mockEventsService.acknowledgeExpiredParticipationConfirmations.mockResolvedValue(
      {
        acknowledgedCount: 2,
      },
    );

    await expect(
      controller.acknowledgeExpiredParticipationConfirmations(
        { id: "guild-1" },
        "event-1",
        { id: 123 },
        { killIds: ["kill-1", "kill-2"] },
      ),
    ).resolves.toEqual({ acknowledgedCount: 2 });

    expect(
      mockEventsService.acknowledgeExpiredParticipationConfirmations,
    ).toHaveBeenCalledWith("guild-1", "event-1", 123, ["kill-1", "kill-2"]);
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
        createAccessPolicy({
          capabilities: [Permission.LOOTLOG_TIMERS_READ],
        }),
      ),
    ).resolves.toEqual([{ npc: { lvl: 120 } }]);
  });

  it("rejects invalid member ids before fetching kill history", async () => {
    await expect(
      controller.getMemberKillHistory(
        { id: "guild-1" },
        "event-1",
        "not-a-number",
        createAccessPolicy({
          capabilities: [Permission.LOOTLOG_EVENTS_READ],
        }),
        undefined,
        undefined,
        undefined,
        [] as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
