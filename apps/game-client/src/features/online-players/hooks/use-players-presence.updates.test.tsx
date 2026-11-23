import type { ServerEvent } from "@lootlog/protocol/realtime";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOnlinePlayersTest,
  createOnlinePresence,
  createPresenceSnapshot,
} from "@/test/online-players-fixtures";
import {
  delta,
  fullPolicy,
  mountPresence,
} from "./use-players-presence.fixtures";
import { usePlayersPresence } from "./use-players-presence";

describe("usePlayersPresence updates", () => {
  let harness: ReturnType<typeof createOnlinePlayersTest>;
  beforeEach(() => {
    harness = createOnlinePlayersTest();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("normalizes initial presence fetch payloads from player location", async () => {
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([createOnlinePresence({ isAfk: true })]),
    );
    const { result } = await mountPresence(harness);
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(result.current.onlinePlayers["discord-1"]?.[0]).toMatchObject({
      mapName: "Karka-han",
      isAfk: true,
      sessionId: "session-1",
      player: {
        lvl: 123,
        location: { map: "Karka-han" },
        clan: { id: 15191, name: "Karhu", rank: 100 },
      },
    });
    expect(harness.fetchPresence).toHaveBeenCalledWith("guild-1", "alpha");
  });

  it("deduplicates initial presence fetch payloads by character and keeps the newest presence", async () => {
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([
        createOnlinePresence({ lastSeen: 1, location: { map: "Old" } }),
        createOnlinePresence({ lastSeen: 2, location: { map: "New" } }),
      ]),
    );
    const { result } = await mountPresence(harness);
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(result.current.onlinePlayers["discord-1"]).toHaveLength(1);
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe("New");
  });

  it("updates existing presence entries from gateway locations", async () => {
    const { result } = await mountPresence(harness);
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    await harness.receive(
      delta(createOnlinePresence({ location: { map: "Ithan" } })),
    );
    await waitFor(() =>
      expect(result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe(
        "Ithan",
      ),
    );
    expect(result.current.onlinePlayers["discord-1"]).toHaveLength(1);
  });

  it("preserves untouched account references during a presence update", async () => {
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([
        createOnlinePresence(),
        createOnlinePresence({
          userId: "user-2",
          discordId: "discord-2",
          sessionId: "session-2",
        }),
      ]),
    );
    const { result } = await mountPresence(harness);
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const untouched = result.current.onlinePlayers["discord-2"];
    await harness.receive(
      delta(createOnlinePresence({ location: { map: "Ithan" } })),
    );
    await waitFor(() =>
      expect(result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe(
        "Ithan",
      ),
    );
    expect(result.current.onlinePlayers["discord-2"]).toBe(untouched);
  });

  it("coalesces gateway update bursts into one render per animation frame", async () => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frame = callback;

      return 1;
    });
    let renders = 0;

    const { result } = renderHook(
      () => {
        renders++;

        return usePlayersPresence("guild-1", "alpha");
      },
      { wrapper: harness.wrapper },
    );

    harness.open();
    await harness.join(["guild-1"], fullPolicy());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const before = renders;
    await harness.receive(
      delta(
        ...Array.from({ length: 15 }, (_, index) =>
          createOnlinePresence({ location: { map: `Map ${index}` } }),
        ),
      ),
    );
    expect(renders).toBe(before);
    act(() => frame?.(16));
    expect(renders).toBe(before + 1);
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.mapName).toBe(
      "Map 14",
    );
  });

  it("removes the row when gateway reports offline status", async () => {
    const { result } = await mountPresence(harness);
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    await harness.receive(delta(createOnlinePresence({ status: "offline" })));
    await waitFor(() =>
      expect(result.current.onlinePlayers["discord-1"]).toBeUndefined(),
    );
  });

  it("removes the matching session without deleting another character or organization", async () => {
    const other = createOnlinePresence({
      sessionId: "session-2",
      character: {
        world: "alpha",
        name: "Other",
        lvl: 100,
        characterId: "11",
        accountId: "20",
        icon: "hero.png",
        prof: "w",
      },
    });

    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([createOnlinePresence(), other]),
    );
    const { result } = await mountPresence(harness);
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    const remove = (organizationId: string): ServerEvent => ({
      v: 1,
      type: "presence.delta",
      data: {
        organizationId,
        revision: 2,
        changes: [
          {
            action: "remove",
            userId: "user-1",
            discordId: "discord-1",
            sessionId: "session-1",
          },
        ],
      },
    });

    await harness.receive(remove("guild-2"));
    expect(result.current.onlinePlayers["discord-1"]).toHaveLength(2);
    await harness.receive(remove("guild-1"));
    await waitFor(() =>
      expect(result.current.onlinePlayers["discord-1"]).toHaveLength(1),
    );
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.sessionId).toBe(
      "session-2",
    );
  });

  it("preserves a replacement session when a late removal names its predecessor", async () => {
    const { result } = await mountPresence(harness);
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    await harness.receive(
      delta(createOnlinePresence({ sessionId: "replacement" })),
    );
    await waitFor(() =>
      expect(result.current.onlinePlayers["discord-1"]?.[0]?.sessionId).toBe(
        "replacement",
      ),
    );
    await harness.receive({
      v: 1,
      type: "presence.delta",
      data: {
        organizationId: "guild-1",
        revision: 3,
        changes: [
          {
            action: "remove",
            userId: "user-1",
            discordId: "discord-1",
            sessionId: "session-1",
          },
        ],
      },
    });
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.sessionId).toBe(
      "replacement",
    );
  });

  it.each([false, true])(
    "applies session removals in order with queued creates (recreated: %s)",
    async (recreated) => {
      let frame: FrameRequestCallback | undefined;
      vi.spyOn(window, "requestAnimationFrame").mockImplementation(
        (callback) => {
          frame = callback;

          return 1;
        },
      );
      harness.fetchPresence.mockResolvedValue(createPresenceSnapshot([]));
      const { result } = await mountPresence(harness);
      await waitFor(() => expect(result.current.hasLoaded).toBe(true));

      const removal: ServerEvent = {
        v: 1,
        type: "presence.delta",
        data: {
          organizationId: "guild-1",
          revision: 3,
          changes: [
            {
              action: "remove",
              userId: "user-1",
              discordId: "discord-1",
              sessionId: "session-1",
            },
          ],
        },
      };

      await harness.receive(delta(createOnlinePresence()), removal);

      if (recreated) await harness.receive(delta(createOnlinePresence()));
      act(() => frame?.(16));
      expect(result.current.onlinePlayers["discord-1"]?.length ?? 0).toBe(
        recreated ? 1 : 0,
      );
    },
  );
});
