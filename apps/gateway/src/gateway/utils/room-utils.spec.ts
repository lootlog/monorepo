import { Permission } from "@lootlog/types";
import { Platform } from "src/gateway/enums/platform.enum";
import type { GuildRole, UserGuildData } from "src/guilds/types/guild.types";
import {
  buildRoomName,
  buildUserGuildRoomName,
  calculateUserRooms,
  getNpcTier,
  hasFeatureRoomAccess,
} from "./room-utils";

function createRole(
  permissions: Permission[],
  lvlRangeFrom = 1,
  lvlRangeTo = 500,
): GuildRole {
  return {
    id: crypto.randomUUID(),
    permissions,
    lvlRangeFrom,
    lvlRangeTo,
  };
}

function createGuildData(
  discordId: string,
  roles: GuildRole[],
  guildId = "guild-1",
  ownerId = "owner-1",
): UserGuildData {
  return {
    guild: {
      id: guildId,
      ownerId: ownerId === "self" ? discordId : ownerId,
    },
    roles,
  };
}

describe("room-utils", () => {
  describe("getNpcTier", () => {
    it("returns titans for numeric NPC payloads resolved from weight", () => {
      expect(
        getNpcTier({
          type: 2,
          wt: "120",
          prof: "w",
        }),
      ).toBe("titans");
    });

    it("returns heroes for explicit event hero type", () => {
      expect(
        getNpcTier({
          type: "EVENT_HERO",
          wt: "85",
          prof: "m",
        }),
      ).toBe("heroes");
    });

    it("falls back to base when type cannot be resolved", () => {
      expect(
        getNpcTier({
          type: "unknown",
          wt: "invalid",
          prof: "m",
        }),
      ).toBe("base");
    });
  });

  describe("hasFeatureRoomAccess", () => {
    it("allows base feature access without npc level when permission matches", () => {
      expect(
        hasFeatureRoomAccess(
          [createRole([Permission.LOOTLOG_CHAT_READ])],
          "chat",
          "base",
        ),
      ).toBe(true);
    });

    it("allows titan access when a role has permission and matching level", () => {
      expect(
        hasFeatureRoomAccess(
          [createRole([Permission.LOOTLOG_CHAT_TITANS_READ], 250, 350)],
          "chat",
          "titans",
          300,
        ),
      ).toBe(true);
    });

    it("rejects titan access without permission", () => {
      expect(
        hasFeatureRoomAccess(
          [createRole([Permission.LOOTLOG_CHAT_READ], 250, 350)],
          "chat",
          "titans",
          300,
        ),
      ).toBe(false);
    });

    it("rejects titan access outside level range", () => {
      expect(
        hasFeatureRoomAccess(
          [createRole([Permission.LOOTLOG_CHAT_TITANS_READ], 1, 299)],
          "chat",
          "titans",
          300,
        ),
      ).toBe(false);
    });

    it("allows access when one of many roles fully matches", () => {
      expect(
        hasFeatureRoomAccess(
          [
            createRole([Permission.LOOTLOG_CHAT_HEROES_READ], 1, 100),
            createRole([Permission.LOOTLOG_CHAT_TITANS_READ], 250, 350),
          ],
          "chat",
          "titans",
          300,
        ),
      ).toBe(true);
    });

    it("rejects access when permission and level are split across roles", () => {
      expect(
        hasFeatureRoomAccess(
          [
            createRole([Permission.LOOTLOG_CHAT_TITANS_READ], 1, 299),
            createRole([], 300, 400),
          ],
          "chat",
          "titans",
          300,
        ),
      ).toBe(false);
    });
  });

  describe("calculateUserRooms", () => {
    it("adds a private user-and-guild room that another user cannot share", () => {
      const guilds = [createGuildData("user-1", [], "guild-1")];

      const firstUserRooms = calculateUserRooms(
        guilds,
        "user-1",
        Platform.GAME,
      ).rooms;
      const secondUserRooms = calculateUserRooms(
        guilds,
        "user-2",
        Platform.GAME,
      ).rooms;

      expect(firstUserRooms).toContain(
        buildUserGuildRoomName("user-1", "guild-1"),
      );
      expect(secondUserRooms).not.toContain(
        buildUserGuildRoomName("user-1", "guild-1"),
      );
    });

    it("returns union of feature rooms across multiple roles for a game user", () => {
      const discordId = "user-1";
      const guilds = [
        createGuildData(discordId, [
          createRole([Permission.LOOTLOG_CHAT_READ]),
          createRole([Permission.LOOTLOG_TIMERS_TITANS_READ]),
          createRole([Permission.LOOTLOG_NOTIFICATIONS_HEROES_READ]),
        ]),
      ];

      const result = calculateUserRooms(guilds, discordId, Platform.GAME);

      expect(result.rooms).toEqual(
        expect.arrayContaining([
          buildRoomName("guild-1", "presence"),
          buildRoomName("guild-1", "events"),
          buildRoomName("guild-1", "chat", "base"),
          buildRoomName("guild-1", "timers", "titans"),
          buildRoomName("guild-1", "notifications", "heroes"),
        ]),
      );
      expect(result.rooms).not.toContain(
        buildRoomName("guild-1", "loots", "base"),
      );
      expect(result.rooms).not.toContain(buildRoomName("guild-1", "admin"));
      expect(result.rooms).not.toContain(
        buildRoomName("guild-1", "online-players"),
      );
    });

    it("returns all feature rooms and admin room for owner", () => {
      const discordId = "owner-1";
      const guilds = [createGuildData(discordId, [], "guild-1", "self")];

      const result = calculateUserRooms(guilds, discordId, Platform.GAME);

      expect(result.rooms).toEqual(
        expect.arrayContaining([
          buildRoomName("guild-1", "admin"),
          buildRoomName("guild-1", "online-players"),
          buildRoomName("guild-1", "chat", "base"),
          buildRoomName("guild-1", "chat", "titans"),
          buildRoomName("guild-1", "chat", "heroes"),
          buildRoomName("guild-1", "timers", "base"),
          buildRoomName("guild-1", "timers", "titans"),
          buildRoomName("guild-1", "timers", "heroes"),
          buildRoomName("guild-1", "notifications", "base"),
          buildRoomName("guild-1", "notifications", "titans"),
          buildRoomName("guild-1", "notifications", "heroes"),
        ]),
      );
    });

    it("does not grant admin room or wildcard feature rooms for LOOTLOG_MANAGE alone", () => {
      const discordId = "user-1";
      const guilds = [
        createGuildData(discordId, [createRole([Permission.LOOTLOG_MANAGE])]),
      ];

      const result = calculateUserRooms(guilds, discordId, Platform.GAME);

      expect(result.rooms).toEqual(
        expect.arrayContaining([
          buildRoomName("guild-1", "presence"),
          buildRoomName("guild-1", "events"),
        ]),
      );
      expect(result.rooms).not.toContain(buildRoomName("guild-1", "admin"));
      expect(result.rooms).not.toContain(
        buildRoomName("guild-1", "chat", "titans"),
      );
      expect(result.rooms).not.toContain(
        buildRoomName("guild-1", "timers", "heroes"),
      );
      expect(result.rooms).not.toContain(
        buildRoomName("guild-1", "notifications", "base"),
      );
      expect(result.rooms).not.toContain(
        buildRoomName("guild-1", "online-players"),
      );
    });

    it("grants online players room when the role has online players permission", () => {
      const discordId = "user-1";
      const guilds = [
        createGuildData(discordId, [
          createRole([Permission.LOOTLOG_ONLINE_PLAYERS_READ], 270, 300),
        ]),
      ];

      const result = calculateUserRooms(guilds, discordId, Platform.GAME);

      expect(result.rooms).toEqual(
        expect.arrayContaining([
          buildRoomName("guild-1", "presence"),
          buildRoomName("guild-1", "events"),
          buildRoomName("guild-1", "online-players"),
        ]),
      );
    });

    it("grants only explicitly permitted feature rooms when LOOTLOG_MANAGE is combined with feature permissions", () => {
      const discordId = "user-1";
      const guilds = [
        createGuildData(discordId, [
          createRole([Permission.LOOTLOG_MANAGE]),
          createRole([Permission.LOOTLOG_CHAT_TITANS_READ]),
          createRole([Permission.LOOTLOG_TIMERS_HEROES_READ]),
        ]),
      ];

      const result = calculateUserRooms(guilds, discordId, Platform.GAME);

      expect(result.rooms).toEqual(
        expect.arrayContaining([
          buildRoomName("guild-1", "presence"),
          buildRoomName("guild-1", "events"),
          buildRoomName("guild-1", "chat", "titans"),
          buildRoomName("guild-1", "timers", "heroes"),
        ]),
      );
      expect(result.rooms).not.toContain(buildRoomName("guild-1", "admin"));
      expect(result.rooms).not.toContain(
        buildRoomName("guild-1", "chat", "base"),
      );
      expect(result.rooms).not.toContain(
        buildRoomName("guild-1", "notifications", "base"),
      );
    });

    it("excludes chat and notifications rooms for web platform", () => {
      const discordId = "user-1";
      const guilds = [
        createGuildData(discordId, [
          createRole([
            Permission.LOOTLOG_CHAT_READ,
            Permission.LOOTLOG_LOOTS_READ,
            Permission.LOOTLOG_TIMERS_READ,
            Permission.LOOTLOG_NOTIFICATIONS_READ,
          ]),
        ]),
      ];

      const result = calculateUserRooms(guilds, discordId, Platform.WEB_APP);

      expect(result.rooms).toEqual(
        expect.arrayContaining([
          buildRoomName("guild-1", "presence"),
          buildRoomName("guild-1", "events"),
          buildRoomName("guild-1", "loots", "base"),
          buildRoomName("guild-1", "timers", "base"),
        ]),
      );
      expect(result.rooms).not.toContain(
        buildRoomName("guild-1", "chat", "base"),
      );
      expect(result.rooms).not.toContain(
        buildRoomName("guild-1", "notifications", "base"),
      );
    });
  });
});
