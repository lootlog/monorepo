import { Capability } from "@lootlog/schema/permissions";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOnlinePlayersTest,
  createOnlinePresence,
  createPresenceSnapshot,
  type PresenceSnapshotData,
} from "@/test/online-players-fixtures";
import {
  delta,
  fullPolicy,
  mountPresence,
  permissionEvent,
  policy,
} from "./use-players-presence.fixtures";
import { usePlayersPresence } from "./use-players-presence";

describe("usePlayersPresence access and connection", () => {
  let harness: ReturnType<typeof createOnlinePlayersTest>;
  beforeEach(() => {
    harness = createOnlinePlayersTest();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("clears players and exposes forbidden access state when gateway denies access", async () => {
    harness.fetchPresence.mockRejectedValue(new Error("denied"));
    const { result } = await mountPresence(harness);
    await waitFor(() => expect(result.current.accessState).toBe("forbidden"));
    expect(result.current.onlinePlayers).toEqual({});
  });

  it("exposes a retryable error when both acknowledgement deadlines expire", async () => {
    vi.useFakeTimers();
    harness.fetchPresence.mockReturnValue(
      new Promise<PresenceSnapshotData>(() => {}),
    );
    const { result } = await mountPresence(harness);
    expect(result.current.initialLoading).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(13_000));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.initialLoading).toBe(false);
    expect(result.current.hasLoaded).toBe(false);
    act(() => result.current.retry());
    await act(() => vi.advanceTimersByTimeAsync(8_000));
    expect(harness.fetchPresence).toHaveBeenCalledTimes(4);
  });

  it("keeps loaded players after disconnecting", async () => {
    const { result } = await mountPresence(harness);
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    act(() => harness.realtime.disconnect());
    expect(result.current.onlinePlayers["discord-1"]).toHaveLength(1);
    expect(result.current.disconnected).toBe(false);
  });

  it("treats the first gateway connection as loading, not as a lost connection", () => {
    const { result } = renderHook(
      () => usePlayersPresence("guild-1", "alpha"),
      { wrapper: harness.wrapper },
    );

    expect(result.current.initialLoading).toBe(true);
    expect(result.current.disconnected).toBe(false);
  });

  it("hides the previous scope while the next scope is loading", async () => {
    let guildId = "guild-1";

    const { result, rerender } = renderHook(
      () => usePlayersPresence(guildId, "alpha"),
      { wrapper: harness.wrapper },
    );

    harness.open();
    await harness.join(
      ["guild-1", "guild-2"],
      policy(
        [
          Capability.LOOTLOG_ONLINE_PLAYERS_READ,
          Capability.LOOTLOG_PRESENCE_LOCATION_READ,
        ],
        ["guild-1", "guild-2"],
      ),
    );
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const response = Promise.withResolvers<PresenceSnapshotData>();
    harness.fetchPresence.mockReturnValue(response.promise);
    guildId = "guild-2";
    rerender();
    expect(result.current.onlinePlayers).toEqual({});
    expect(result.current.initialLoading).toBe(true);
    response.resolve({
      ...createPresenceSnapshot([]),
      organizationId: "guild-2",
    });
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
  });

  it("keeps rows for unrelated changes, scrubs revoked location, and ignores the old request", async () => {
    const { result } = await mountPresence(harness);
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const rows = result.current.onlinePlayers;
    await harness.receive(
      permissionEvent(
        policy(
          [
            Capability.LOOTLOG_ONLINE_PLAYERS_READ,
            Capability.LOOTLOG_PRESENCE_LOCATION_READ,
          ],
          ["guild-1", "guild-2"],
        ),
      ),
    );
    expect(result.current.onlinePlayers).toBe(rows);
    expect(harness.fetchPresence).toHaveBeenCalledTimes(1);
    const response = Promise.withResolvers<PresenceSnapshotData>();
    harness.fetchPresence.mockReturnValue(response.promise);
    act(() => result.current.retry());
    await waitFor(() => expect(harness.fetchPresence).toHaveBeenCalledTimes(2));
    await harness.receive(
      permissionEvent(policy([Capability.LOOTLOG_ONLINE_PLAYERS_READ])),
    );
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.player?.name).toBe(
      "Hero",
    );
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.player?.location,
    ).toBeUndefined();
    await act(async () => {
      response.resolve(createPresenceSnapshot());
      await response.promise;
    });
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.mapName,
    ).toBeUndefined();
    expect(result.current.hasLoaded).toBe(true);
  });

  it("coalesces expansions for five seconds without clearing loaded rows", async () => {
    const { result } = await mountPresence(harness);
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    await harness.receive(
      permissionEvent(policy([Capability.LOOTLOG_ONLINE_PLAYERS_READ])),
    );
    const rows = result.current.onlinePlayers;
    vi.useFakeTimers();
    await harness.receive(
      permissionEvent(fullPolicy()),
      permissionEvent(fullPolicy()),
    );
    await act(() => vi.advanceTimersByTimeAsync(4999));
    expect(result.current.onlinePlayers).toBe(rows);
    expect(harness.fetchPresence).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(harness.fetchPresence).toHaveBeenCalledTimes(2);
  });

  it("filters live presence before an animation frame commits and rejects revoked access", async () => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frame = callback;

      return 1;
    });
    harness.fetchPresence.mockResolvedValue(createPresenceSnapshot([]));
    const { result } = await mountPresence(harness);
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    await harness.receive(delta(createOnlinePresence()));
    await harness.receive(
      permissionEvent(policy([Capability.LOOTLOG_ONLINE_PLAYERS_READ])),
    );
    act(() => frame?.(16));
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.player?.name).toBe(
      "Hero",
    );
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.mapName,
    ).toBeUndefined();
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.player?.location,
    ).toBeUndefined();
    await harness.receive(delta(createOnlinePresence()));
    act(() => frame?.(24));
    expect(result.current.onlinePlayers["discord-1"]?.[0]?.player?.name).toBe(
      "Hero",
    );
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.player?.location,
    ).toBeUndefined();
    await harness.receive(delta(createOnlinePresence()));
    act(() => frame?.(32));
    expect(
      result.current.onlinePlayers["discord-1"]?.[0]?.mapName,
    ).toBeUndefined();
    await harness.receive(
      permissionEvent(policy([])),
      delta(createOnlinePresence()),
    );
    expect(result.current.onlinePlayers).toEqual({});
    await harness.receive(permissionEvent(fullPolicy()));
    act(() => frame?.(48));
    expect(result.current.onlinePlayers).toEqual({});
  });
});
