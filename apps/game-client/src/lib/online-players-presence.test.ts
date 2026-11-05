import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyPresenceUpdates,
  requestServerPresence,
  toPlayerPresence,
  type PlayerPresence,
} from "./online-players-presence";

afterEach(() => {
  vi.useRealTimers();
});

const createPresence = (
  discordId: string,
  characterId: string,
  mapName: string,
): PlayerPresence => ({
  discordId,
  isAfk: false,
  mapName,
  platform: "game",
  status: "online",
  player: {
    accountId: `account-${characterId}`,
    characterId,
    icon: "hero.png",
    lvl: 100,
    name: `Hero ${characterId}`,
    prof: "w",
    world: "alpha",
  },
});

describe("online players presence", () => {
  it("applies a batch with one top-level clone and preserves untouched accounts", () => {
    const firstPresence = createPresence("discord-1", "1", "Ithan");
    const untouchedPresences = [createPresence("discord-2", "2", "Karka-han")];

    const previous = {
      "discord-1": [firstPresence],
      "discord-2": untouchedPresences,
    };

    const next = applyPresenceUpdates(previous, [
      createPresence("discord-1", "1", "Torneg"),
      createPresence("discord-3", "3", "Werbin"),
    ]);

    expect(next).not.toBe(previous);
    expect(next["discord-2"]).toBe(untouchedPresences);
    expect(next["discord-1"]?.[0]?.mapName).toBe("Torneg");
    expect(next["discord-3"]?.[0]?.mapName).toBe("Werbin");
    expect(previous["discord-1"][0]).toBe(firstPresence);
  });

  it("returns the same response for a no-op batch", () => {
    const previous = {
      "discord-1": [createPresence("discord-1", "1", "Ithan")],
    };

    const next = applyPresenceUpdates(previous, [
      {
        discordId: "discord-missing",
        isAfk: false,
        status: "offline",
      },
      {
        discordId: "discord-2",
        isAfk: false,
        status: "online",
      },
    ]);

    expect(next).toBe(previous);
  });

  it("marks a verified Margonem account on the character's presence", () => {
    expect(
      toPlayerPresence("guild-1", {
        userId: "user-1",
        discordId: "discord-1",
        sessionId: "session-1",
        organizationIds: ["guild-1"],
        platform: "game",
        status: "online",
        confidence: "verified",
        isAfk: false,
        lastSeen: 1,
        character: {
          world: "alpha",
          name: "Hero",
          lvl: 100,
          icon: "icon",
          characterId: "10",
          accountId: "20",
          prof: "w",
        },
      }),
    ).toEqual(
      expect.objectContaining({
        discordId: "discord-1",
        guildId: "guild-1",
        margonemAccountVerified: true,
        player: expect.objectContaining({
          characterId: "10",
          accountId: "20",
        }),
      }),
    );
  });

  it("uses an acknowledgement timeout and retries once after a delay", async () => {
    vi.useFakeTimers();
    const response = { status: "success" as const, players: {} };

    const fetchPresence = vi
      .fn<Parameters<typeof requestServerPresence>[0]["fetchPresence"]>()
      .mockRejectedValueOnce(new Error("ack timeout"))
      .mockResolvedValueOnce(response);

    const request = requestServerPresence(
      { fetchPresence },
      "guild-1",
      "tempest",
    );

    await vi.advanceTimersByTimeAsync(999);
    expect(fetchPresence).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2_001);
    await expect(request).resolves.toEqual(response);
    expect(fetchPresence).toHaveBeenCalledTimes(2);
    expect(fetchPresence).toHaveBeenNthCalledWith(
      1,
      "guild-1",
      "tempest",
      5_000,
    );
    expect(fetchPresence).toHaveBeenNthCalledWith(
      2,
      "guild-1",
      "tempest",
      5_000,
    );
  });
});
