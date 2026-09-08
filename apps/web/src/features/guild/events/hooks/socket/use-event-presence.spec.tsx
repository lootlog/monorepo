// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { PresenceWithLocation } from "@lootlog/client/realtime";
import { createTestGateway } from "@/lib/testing/gateway";
import { useEventPresence } from "./use-event-presence";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("keeps the last presence snapshot while permissions are rebalanced", async () => {
  const gateway = createTestGateway();
  const presence: PresenceWithLocation = {
    userId: "user-1",
    organizationIds: ["guild-1"],
    sessionId: "session-1",
    platform: "game",
    status: "online",
    confidence: "reported",
    isAfk: false,
    lastSeen: 1,
    character: {
      world: "tempest",
      name: "Wild",
      characterId: "character-1",
      accountId: "account-1",
      icon: "wild.png",
      lvl: 300,
      prof: "w",
    },
    location: { mapId: 2354, map: "Sala Mroźnych Szeptów", x: 0, y: 0 },
  };
  gateway.request
    .mockResolvedValueOnce({
      organizationId: "guild-1",
      revision: 1,
      presences: [presence],
    })
    .mockImplementationOnce(() => new Promise(() => undefined));
  const { result } = renderHook(
    () => useEventPresence({ guildId: "guild-1", world: "tempest" }),
    { wrapper: gateway.wrapper },
  );
  await waitFor(() =>
    expect(result.current.presenceData?.get("user-1")).toEqual([
      expect.objectContaining({
        name: "Wild",
        lvl: "300",
        mapId: 2354,
        mapName: "Sala Mroźnych Szeptów",
      }),
    ]),
  );
  const previousPresence = result.current.presenceData;
  expect(result.current.accessState).toBe("allowed");
  act(() =>
    gateway.deliver({
      v: 1,
      type: "permissions.updated",
      data: { organizationIds: [], subscriptionScopes: [] },
    }),
  );
  await waitFor(() => expect(gateway.request).toHaveBeenCalledTimes(2));
  expect(result.current.presenceData).toBe(previousPresence);
  expect(result.current.accessState).toBe("allowed");
});
