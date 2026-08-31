import { db as prismaDb } from "#src/prisma/db";
import { NotificationMatchingService } from "./notification-matching.service.js";

const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType = (typeof NpcType)[keyof typeof NpcType];
const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

describe("NotificationMatchingService", () => {
  let service: NotificationMatchingService;

  beforeEach(() => {
    service = new NotificationMatchingService({ query: vi.fn() } as never);
  });

  it("returns empty filters for invalid filter payloads", () => {
    expect(service.parseFilters(null as never)).toEqual({});
    expect(service.parseFilters([] as never)).toEqual({});
    expect(service.parseFilters("invalid" as never)).toEqual({});
  });

  it("allows guild owners to view any loot", () => {
    expect(
      service.canRolesViewLoot([], [{ type: NpcType.TITAN, level: 300 }], true),
    ).toBe(true);
  });

  it("does not give administrators a loot visibility bypass", () => {
    expect(
      service.canRolesViewLoot(
        [
          {
            id: "admin",
            permissions: [Permission.ADMIN],
            lvlRangeFrom: 1,
            lvlRangeTo: 10,
          },
        ],
        [{ type: NpcType.TITAN, level: 300 }],
      ),
    ).toBe(false);
  });

  it("blocks access when no readable role exists", () => {
    expect(
      service.canRolesViewLoot(
        [
          {
            id: "titan-only",
            permissions: [Permission.LOOTLOG_LOOTS_TITANS_READ],
            lvlRangeFrom: 1,
            lvlRangeTo: 500,
          },
        ],
        [{ type: NpcType.TITAN, level: 300 }],
      ),
    ).toBe(false);
  });

  it("requires a single role to satisfy loot read, tier permission and level range", () => {
    expect(
      service.canRolesViewLoot(
        [
          {
            id: "read",
            permissions: [Permission.LOOTLOG_LOOTS_READ],
            lvlRangeFrom: 1,
            lvlRangeTo: 500,
          },
          {
            id: "titan",
            permissions: [Permission.LOOTLOG_LOOTS_TITANS_READ],
            lvlRangeFrom: 250,
            lvlRangeTo: 350,
          },
        ],
        [{ type: NpcType.TITAN, level: 300 }],
      ),
    ).toBe(false);
  });

  it("allows access when one role fully matches loot read, tier permission and level range", () => {
    expect(
      service.canRolesViewLoot(
        [
          {
            id: "complete-titan",
            permissions: [
              Permission.LOOTLOG_LOOTS_READ,
              Permission.LOOTLOG_LOOTS_TITANS_READ,
            ],
            lvlRangeFrom: 250,
            lvlRangeTo: 350,
          },
        ],
        [{ type: NpcType.TITAN, level: 300 }],
      ),
    ).toBe(true);
  });

  it("fails closed for unknown NPC levels", () => {
    expect(
      service.canRolesViewLoot(
        [
          {
            id: "complete-titan",
            permissions: [
              Permission.LOOTLOG_LOOTS_READ,
              Permission.LOOTLOG_LOOTS_TITANS_READ,
            ],
            lvlRangeFrom: 250,
            lvlRangeTo: 350,
          },
        ],
        [{ type: NpcType.TITAN, level: null }],
      ),
    ).toBe(false);
  });

  it("blocks heroes without heroes read permission", () => {
    expect(
      service.canRolesViewLoot(
        [
          {
            id: "base",
            permissions: [Permission.LOOTLOG_LOOTS_READ],
            lvlRangeFrom: 80,
            lvlRangeTo: 180,
          },
        ],
        [{ type: NpcType.EVENT_HERO, level: 120 }],
      ),
    ).toBe(false);
  });
});
