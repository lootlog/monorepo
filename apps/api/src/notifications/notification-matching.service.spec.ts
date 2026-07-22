import { NpcType, Permission } from "src/generated/prisma/client";
import { NotificationMatchingService } from "./notification-matching.service";

describe("NotificationMatchingService", () => {
  let service: NotificationMatchingService;

  beforeEach(() => {
    service = new NotificationMatchingService({
      member: {
        findMany: vi.fn<() => Promise<unknown[]>>(),
      },
    } as never);
  });

  it("returns empty filters for invalid filter payloads", () => {
    expect(service.parseFilters(null as never)).toEqual({});
    expect(service.parseFilters([] as never)).toEqual({});
    expect(service.parseFilters("invalid" as never)).toEqual({});
  });

  it("allows guild owners to view any npc", () => {
    expect(service.canRolesViewNpc([], NpcType.TITAN, 300, true)).toBe(true);
  });

  it("allows administrative users to bypass npc filtering", () => {
    expect(
      service.canRolesViewNpc(
        [
          {
            permissions: [Permission.ADMIN],
            lvlRangeFrom: 1,
            lvlRangeTo: 10,
          },
        ],
        NpcType.TITAN,
        300,
      ),
    ).toBe(true);
  });

  it("blocks access when no readable role exists", () => {
    expect(
      service.canRolesViewNpc(
        [
          {
            permissions: [Permission.LOOTLOG_LOOTS_TITANS_READ],
            lvlRangeFrom: 1,
            lvlRangeTo: 500,
          },
        ],
        NpcType.TITAN,
        300,
      ),
    ).toBe(false);
  });

  it("requires a single role to satisfy loot read, tier permission and level range", () => {
    expect(
      service.canRolesViewNpc(
        [
          {
            permissions: [Permission.LOOTLOG_LOOTS_READ],
            lvlRangeFrom: 1,
            lvlRangeTo: 500,
          },
          {
            permissions: [Permission.LOOTLOG_LOOTS_TITANS_READ],
            lvlRangeFrom: 250,
            lvlRangeTo: 350,
          },
        ],
        NpcType.TITAN,
        300,
      ),
    ).toBe(false);
  });

  it("allows access when one role fully matches loot read, tier permission and level range", () => {
    expect(
      service.canRolesViewNpc(
        [
          {
            permissions: [
              Permission.LOOTLOG_LOOTS_READ,
              Permission.LOOTLOG_LOOTS_TITANS_READ,
            ],
            lvlRangeFrom: 250,
            lvlRangeTo: 350,
          },
        ],
        NpcType.TITAN,
        300,
      ),
    ).toBe(true);
  });

  it("allows access for unknown npc levels when tier permissions match", () => {
    expect(
      service.canRolesViewNpc(
        [
          {
            permissions: [
              Permission.LOOTLOG_LOOTS_READ,
              Permission.LOOTLOG_LOOTS_TITANS_READ,
            ],
            lvlRangeFrom: 250,
            lvlRangeTo: 350,
          },
        ],
        NpcType.TITAN,
        null,
      ),
    ).toBe(true);
  });

  it("blocks heroes without heroes read permission", () => {
    expect(
      service.canRolesViewNpc(
        [
          {
            permissions: [Permission.LOOTLOG_LOOTS_READ],
            lvlRangeFrom: 80,
            lvlRangeTo: 180,
          },
        ],
        NpcType.EVENT_HERO,
        120,
      ),
    ).toBe(false);
  });
});
