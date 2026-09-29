import {
  applyGamePresenceUpdate,
  mapMemberGamePresenceByDiscordId,
} from "@/lib/game-presence";
import { describe, expect, it } from "vitest";
import {
  isMemberGamePresenceVerified,
  isMemberOnlineInGame,
} from "./member-game-presence.utils";
import type { PlayerPresence } from "@/lib/gateway-client";

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
  it("maps presence by Discord ID and skips empty entries", () => {
    const mapped = mapMemberGamePresenceByDiscordId({
      "discord-1": [buildPresence({ sessionId: "session-1" })],
      "discord-2": [],
    });

    expect(mapped.get("discord-1")).toHaveLength(1);
    expect(mapped.has("discord-2")).toBe(false);
  });

  it("adds and updates a game presence session", () => {
    const added = applyGamePresenceUpdate(undefined, {
      guildId: "guild-1",
      discordId: "discord-1",
      player: buildPresence({ sessionId: "session-1", mapName: "Ithan" }),
    });

    const updated = applyGamePresenceUpdate(added, {
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

    const updated = applyGamePresenceUpdate(mapped, {
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
});
