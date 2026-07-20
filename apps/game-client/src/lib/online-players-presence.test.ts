import { describe, expect, it, vi } from "vitest";
import {
  applyPresenceUpdates,
  normalizePresence,
  requestServerPresence,
  type PlayerPresence,
} from "./online-players-presence";

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

  it("preserves Margonem verification from player presence payloads", () => {
    expect(
      normalizePresence({
        discordId: "discord-1",
        guildId: "guild-1",
        playerPresence: {
          world: "alpha",
          name: "Hero",
          lvl: "100",
          icon: "icon",
          characterId: "10",
          accountId: "20",
          prof: "w",
          sessionId: "session-1",
          margonemAccountVerified: true,
        },
      }),
    ).toEqual(
      expect.objectContaining({
        discordId: "discord-1",
        margonemAccountVerified: true,
        player: expect.objectContaining({
          characterId: "10",
          accountId: "20",
        }),
      }),
    );
  });

  it("uses an acknowledgement timeout and retries once", async () => {
    const response = { status: "success" as const, players: {} };
    const emitWithAck = vi
      .fn()
      .mockRejectedValueOnce(new Error("ack timeout"))
      .mockResolvedValueOnce(response);
    const timeout = vi.fn(() => ({ emitWithAck }));

    await expect(
      requestServerPresence({ timeout }, "guild-1", "tempest"),
    ).resolves.toEqual(response);
    expect(timeout).toHaveBeenCalledTimes(2);
    expect(timeout).toHaveBeenNthCalledWith(1, 5_000);
    expect(timeout).toHaveBeenNthCalledWith(2, 5_000);
    expect(emitWithAck).toHaveBeenCalledTimes(2);
  });
});
