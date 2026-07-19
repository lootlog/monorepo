import { describe, expect, it, vi } from "vitest";
import {
  normalizePresence,
  requestServerPresence,
} from "./online-players-presence";

describe("online players presence", () => {
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
