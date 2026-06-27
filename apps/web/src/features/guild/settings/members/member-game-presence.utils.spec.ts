import { describe, expect, it } from "vitest";
import {
  applyMemberGamePresenceUpdate,
  getMemberGameSessionCount,
  isMemberGamePresenceVerified,
  getMemberOnlineSources,
  isMemberOnlineInGame,
  mapMemberGamePresenceByDiscordId,
  resolveMemberPresenceGuildId,
} from "./member-game-presence.utils";
import { mapMemberWebPresenceByDiscordId } from "./member-web-presence.utils";
import type { PlayerPresence } from "@/features/guild/events/hooks/socket/use-event-presence";

const buildPresence = (overrides: Partial<PlayerPresence>): PlayerPresence => ({
  world: "alpha",
  name: "Hero",
  characterId: "10",
  accountId: "20",
  icon: "icon.gif",
  lvl: "100",
  prof: "w",
  isAfk: false,
  updatedAt: 1,
  sessionId: "session-1",
  ...overrides,
});

describe("member game presence utils", () => {
  it("resolves presence guild id from the loaded guild", () => {
    expect(resolveMemberPresenceGuildId({ id: "guild-1" })).toBe("guild-1");
    expect(resolveMemberPresenceGuildId({ id: null })).toBeUndefined();
    expect(resolveMemberPresenceGuildId(undefined)).toBeUndefined();
  });

  it("maps presence by Discord ID and skips empty entries", () => {
    const mapped = mapMemberGamePresenceByDiscordId({
      "discord-1": [buildPresence({ sessionId: "session-1" })],
      "discord-2": [],
    });

    expect(mapped.get("discord-1")).toHaveLength(1);
    expect(mapped.has("discord-2")).toBe(false);
  });

  it("adds and updates a game presence session", () => {
    const added = applyMemberGamePresenceUpdate(undefined, {
      guildId: "guild-1",
      discordId: "discord-1",
      player: buildPresence({ sessionId: "session-1", mapName: "Ithan" }),
    });
    const updated = applyMemberGamePresenceUpdate(added, {
      guildId: "guild-1",
      discordId: "discord-1",
      player: buildPresence({ sessionId: "session-1", mapName: "Karka-han" }),
    });

    expect(updated.get("discord-1")).toHaveLength(1);
    expect(updated.get("discord-1")?.[0]?.mapName).toBe("Karka-han");
  });

  it("removes a disconnected game presence session", () => {
    const mapped = mapMemberGamePresenceByDiscordId({
      "discord-1": [
        buildPresence({ sessionId: "session-1" }),
        buildPresence({ sessionId: "session-2" }),
      ],
    });
    const updated = applyMemberGamePresenceUpdate(mapped, {
      guildId: "guild-1",
      discordId: "discord-1",
      sessionId: "session-1",
      status: "offline",
    });

    expect(updated.get("discord-1")).toHaveLength(1);
    expect(updated.get("discord-1")?.[0]?.sessionId).toBe("session-2");
  });

  it("detects game online status", () => {
    const mapped = mapMemberGamePresenceByDiscordId({
      "discord-1": [buildPresence({ sessionId: "session-1" })],
    });

    expect(isMemberOnlineInGame(mapped, "discord-1")).toBe(true);
    expect(isMemberOnlineInGame(mapped, "discord-2")).toBe(false);
    expect(isMemberOnlineInGame(undefined, "discord-1")).toBe(false);
  });

  it("detects verified Margonem game presence", () => {
    const mapped = mapMemberGamePresenceByDiscordId({
      "discord-1": [
        buildPresence({ sessionId: "session-1" }),
        buildPresence({
          sessionId: "session-2",
          margonemAccountVerified: true,
        }),
      ],
      "discord-2": [buildPresence({ sessionId: "session-3" })],
    });

    expect(isMemberGamePresenceVerified(mapped, "discord-1")).toBe(true);
    expect(isMemberGamePresenceVerified(mapped, "discord-2")).toBe(false);
    expect(isMemberGamePresenceVerified(undefined, "discord-1")).toBe(false);
  });

  it("counts active game sessions", () => {
    const mapped = mapMemberGamePresenceByDiscordId({
      "discord-1": [
        buildPresence({ sessionId: "session-1" }),
        buildPresence({ sessionId: "session-2" }),
      ],
      "discord-2": [buildPresence({ sessionId: "session-3" })],
    });

    expect(getMemberGameSessionCount(undefined, "discord-1")).toBe(0);
    expect(getMemberGameSessionCount(mapped, "discord-1")).toBe(2);
    expect(getMemberGameSessionCount(mapped, "discord-2")).toBe(1);
    expect(getMemberGameSessionCount(mapped, "discord-3")).toBe(0);
  });

  it("combines web and game online sources", () => {
    const gamePresence = mapMemberGamePresenceByDiscordId({
      "discord-1": [buildPresence({ sessionId: "session-1" })],
    });
    const webPresence = mapMemberWebPresenceByDiscordId({
      "discord-1": [{ sessionId: "web-session-1" }],
    });

    expect(
      getMemberOnlineSources({
        webPresenceByDiscordId: undefined,
        gamePresenceByDiscordId: undefined,
        discordId: "discord-1",
      }),
    ).toEqual({ web: false, game: false, online: false });
    expect(
      getMemberOnlineSources({
        webPresenceByDiscordId: webPresence,
        gamePresenceByDiscordId: undefined,
        discordId: "discord-1",
      }),
    ).toEqual({ web: true, game: false, online: true });
    expect(
      getMemberOnlineSources({
        webPresenceByDiscordId: undefined,
        gamePresenceByDiscordId: gamePresence,
        discordId: "discord-1",
      }),
    ).toEqual({ web: false, game: true, online: true });
    expect(
      getMemberOnlineSources({
        webPresenceByDiscordId: webPresence,
        gamePresenceByDiscordId: gamePresence,
        discordId: "discord-1",
      }),
    ).toEqual({ web: true, game: true, online: true });
  });
});
