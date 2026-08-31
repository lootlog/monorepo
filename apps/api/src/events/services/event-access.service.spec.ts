import { db as prismaDb } from "#src/prisma/db";
import type { Contract, FieldOutputTypes } from "../../prisma/contract.js";
import { NotFoundException } from "@nestjs/common";
import { EventAccessService } from "./event-access.service.js";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];
type Role = FieldOutputTypes["public"]["Role"];

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
  const eventFirst = vi.fn();
  const heroFirst = vi.fn();
  const mapFirst = vi.fn();
  const mockPrisma = {
    orm: {
      public: {
        Event: { where: vi.fn(() => ({ first: eventFirst })) },
        EventHeroNpc: { where: vi.fn(() => ({ first: heroFirst })) },
        EventMap: { where: vi.fn(() => ({ first: mapFirst })) },
      },
    },
  };

  let service: EventAccessService;

  beforeEach(() => {
    vi.clearAllMocks();
    eventFirst.mockResolvedValue({ id: "event-1" });
    service = new EventAccessService({ db: mockPrisma } as never);
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
    heroFirst.mockResolvedValue(hero);

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
    heroFirst.mockResolvedValue({
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
    mapFirst.mockResolvedValue({ id: "map-1", heroNpcId: "hero-1" });
    heroFirst.mockResolvedValue({ id: "hero-1", npcLvl: 320 });

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
