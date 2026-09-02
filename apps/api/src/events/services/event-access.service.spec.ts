import { vi } from "#test/bun-test";
import { NotFoundException } from "#src/shared/http/http-errors";
import { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";
import { EventAccessService } from "./event-access.service.js";
import { EventAccessRepository } from "./event-access.repository.js";

type Role = typeof roleTable.$inferSelect;

function createRole(
  permissions: Permission[],
  lvlRangeFrom = 1,
  lvlRangeTo = 500,
): Role {
  return {
    id: crypto.randomUUID(),
    guildId: "guild-1",
    name: "role",
    color: null,
    position: 1,
    permissions,
    lvlRangeFrom,
    lvlRangeTo,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("EventAccessService", () => {
  const repository = {
    findHero: vi.fn(),
    findMap: vi.fn(),
  };

  let service: EventAccessService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EventAccessService(
      repository as unknown as EventAccessRepository,
    );
  });

  it("filters event heroes by visible level ranges", () => {
    const event = {
      id: "event-1",
      heroNpcs: [{ npcLvl: 120 }, { npcLvl: 320 }],
    };

    expect(
      service.filterEventHeroesByLevel(
        event,
        [createRole([Permission.LOOTLOG_EVENTS_READ], 100, 200)],
        [Permission.LOOTLOG_EVENTS_READ],
      ),
    ).toEqual({
      ...event,
      heroNpcs: [{ npcLvl: 120 }],
    });
  });

  it("returns false when a hero is outside visible ranges", () => {
    expect(
      service.isHeroVisibleToUser(
        { npcLvl: 320 },
        [createRole([Permission.LOOTLOG_EVENTS_READ], 100, 200)],
        [Permission.LOOTLOG_EVENTS_READ],
      ),
    ).toBe(false);
  });

  it("returns the hero when access check passes", async () => {
    const hero = { id: "hero-1", npcLvl: 150 };
    repository.findHero.mockResolvedValue(hero);

    await expect(
      service.getHeroWithAccessCheck(
        "guild-1",
        "event-1",
        "hero-1",
        [createRole([Permission.LOOTLOG_EVENTS_READ], 100, 200)],
        [Permission.LOOTLOG_EVENTS_READ],
      ),
    ).resolves.toEqual(hero);
  });

  it("throws when the hero is not visible to the caller", async () => {
    repository.findHero.mockResolvedValue({
      id: "hero-1",
      npcLvl: 320,
    });

    await expect(
      service.getHeroWithAccessCheck(
        "guild-1",
        "event-1",
        "hero-1",
        [createRole([Permission.LOOTLOG_EVENTS_READ], 100, 200)],
        [Permission.LOOTLOG_EVENTS_READ],
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws when the map hero is not visible to the caller", async () => {
    repository.findMap.mockResolvedValue({
      id: "map-1",
      heroNpc: {
        id: "hero-1",
        npcLvl: 320,
      },
    });

    await expect(
      service.getMapWithHeroAccessCheck(
        "guild-1",
        "event-1",
        "map-1",
        [createRole([Permission.LOOTLOG_EVENTS_READ], 100, 200)],
        [Permission.LOOTLOG_EVENTS_READ],
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
