import { describe, expect, it } from "bun:test";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import { memberCapabilities } from "@lootlog/domain/access-policy";
import {
  notificationMatchingPolicy as service,
  type NotificationMemberRoleInfo,
} from "#src/notifications/rules/notification-matching.service";

const canRolesViewLoot = (
  roles: NotificationMemberRoleInfo["roles"],
  npcs: Parameters<typeof service.canMemberViewLoot>[1],
  isGuildOwner = false,
) =>
  service.canMemberViewLoot(
    {
      roles,
      permissions: memberCapabilities({
        ownerId: "owner",
        viewerId: isGuildOwner ? "owner" : "member",
        roles,
      }),
    },
    npcs,
  );

describe("NotificationMatchingService", () => {
  it("returns empty filters for invalid filter payloads", () => {
    expect(service.parseFilters(null)).toEqual({});
    expect(service.parseFilters([])).toEqual({});
    expect(service.parseFilters("invalid")).toEqual({});
  });

  it("allows guild owners to view any loot", () => {
    expect(
      canRolesViewLoot([], [{ type: NpcType.TITAN, level: 300 }], true),
    ).toBe(true);
  });

  it("does not give administrators a loot visibility bypass", () => {
    expect(
      canRolesViewLoot(
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
      canRolesViewLoot(
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
      canRolesViewLoot(
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
      canRolesViewLoot(
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
      canRolesViewLoot(
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
      canRolesViewLoot(
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
  it("reports rule selections unmatched by timers without mixing runtime and template ids", () => {
    const filters = { npcIds: [10, 20], npcTemplateIds: [10, 30] };

    const timers = [
      { npcId: 10, templateId: 30 },
      { npcId: 40, templateId: null },
    ];

    expect(service.unmatchedTimerSelections(filters, timers)).toEqual({
      npcIds: [20],
      templateIds: [10],
    });
  });
});
