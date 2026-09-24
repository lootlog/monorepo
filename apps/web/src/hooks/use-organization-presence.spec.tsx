// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { PresenceWithLocation } from "@lootlog/client/realtime";
import type { decodePresenceSnapshot } from "@lootlog/protocol/realtime/codec";
import { createTestGateway } from "@/lib/testing/gateway";
import { useMemberGamePresence } from "@/features/guild/settings/members/use-member-game-presence";
import { useMemberWebPresence } from "@/features/guild/settings/members/use-member-web-presence";
import { useEventPresence } from "@/features/guild/events/hooks/socket/use-event-presence";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("shares presence across member and event views without refetching on rerenders or world changes", async () => {
  const gateway = createTestGateway();

  const presence: PresenceWithLocation = {
    userId: "user-1",
    discordId: "discord-1",
    organizationIds: ["guild-1"],
    sessionId: "game-1",
    platform: "game",
    status: "online",
    confidence: "verified",
    isAfk: false,
    lastSeen: 1,
    character: {
      world: "alpha",
      name: "Hero",
      characterId: "10",
      accountId: "20",
      icon: "hero.png",
      lvl: 100,
      prof: "w",
    },
    location: { mapId: 25, map: "Forest", x: 0, y: 0 },
  };

  gateway.request.mockResolvedValueOnce({
    organizationId: "guild-1",
    revision: 1,
    presences: [
      presence,
      { ...presence, platform: "web-app", sessionId: "web-1" },
    ],
  });
  gateway.request.mockImplementation(() => new Promise(() => undefined));

  const { result, rerender } = renderHook(
    ({ world }) => ({
      game: useMemberGamePresence("guild-1"),
      web: useMemberWebPresence("guild-1"),
      event: useEventPresence({ guildId: "guild-1", world }),
    }),
    { initialProps: { world: "alpha" }, wrapper: gateway.wrapper },
  );

  await waitFor(() =>
    expect(result.current.game?.get("discord-1")).toHaveLength(1),
  );
  expect(gateway.request).toHaveBeenCalledTimes(1);
  await waitFor(() => {
    expect(result.current.web?.get("discord-1")).toEqual(new Set(["web-1"]));
    expect(result.current.event.presenceData?.get("discord-1")).toEqual([
      expect.objectContaining({ mapId: 25, mapName: "Forest" }),
    ]);
  });
  expect(gateway.request).toHaveBeenCalledTimes(1);
  rerender({ world: "other" });
  expect(result.current.event.presenceData?.has("discord-1")).toBe(false);
  expect(gateway.request).toHaveBeenCalledTimes(1);
  act(() =>
    gateway.deliver({
      v: 1,
      type: "permissions.updated",
      data: { organizationIds: [], subscriptionScopes: [] },
    }),
  );
  await waitFor(() => expect(gateway.request).toHaveBeenCalledTimes(2));
  expect(result.current.game?.get("discord-1")).toHaveLength(1);
});

it("keeps the remaining subscriber live and isolates Organizations", async () => {
  const gateway = createTestGateway();
  gateway.request
    .mockResolvedValueOnce({
      organizationId: "guild-1",
      revision: 1,
      presences: [],
    })
    .mockResolvedValueOnce({
      organizationId: "guild-2",
      revision: 1,
      presences: [],
    })
    .mockImplementation(() => new Promise(() => undefined));

  const first = renderHook(() => useMemberWebPresence("guild-1"), {
    wrapper: gateway.wrapper,
  });

  const remaining = renderHook(() => useMemberWebPresence("guild-1"), {
    wrapper: gateway.wrapper,
  });

  const other = renderHook(() => useMemberWebPresence("guild-2"), {
    wrapper: gateway.wrapper,
  });

  await waitFor(() => {
    expect(remaining.result.current?.size).toBe(0);
    expect(other.result.current?.size).toBe(0);
  });
  expect(gateway.request).toHaveBeenCalledTimes(2);
  first.unmount();
  await act(async () => undefined);
  act(() =>
    gateway.deliver({
      v: 1,
      type: "presence.delta",
      data: {
        organizationId: "guild-1",
        revision: 2,
        changes: [
          {
            action: "upsert",
            presence: {
              userId: "user-1",
              discordId: "discord-1",
              organizationIds: ["guild-1"],
              sessionId: "web-1",
              platform: "web-app",
              status: "online",
              confidence: "reported",
              isAfk: false,
              lastSeen: 1,
            },
          },
        ],
      },
    }),
  );
  expect(remaining.result.current?.get("discord-1")).toEqual(
    new Set(["web-1"]),
  );
  expect(other.result.current?.size).toBe(0);

  remaining.unmount();
  await act(async () => undefined);
  act(() =>
    gateway.deliver({
      v: 1,
      type: "permissions.updated",
      data: { organizationIds: [], subscriptionScopes: [] },
    }),
  );
  expect(gateway.request).toHaveBeenCalledTimes(3);
  expect(gateway.request).toHaveBeenLastCalledWith("presence.fetch", {
    organizationId: "guild-2",
    delivery: "response",
  });
});

it("does not duplicate a fetch during React effect rehearsal", async () => {
  const gateway = createTestGateway();
  gateway.request.mockResolvedValue({
    organizationId: "guild-1",
    revision: 1,
    presences: [],
  });

  const { result } = renderHook(() => useMemberWebPresence("guild-1"), {
    wrapper: gateway.wrapper,
    reactStrictMode: true,
  });

  await waitFor(() => expect(result.current?.size).toBe(0));
  expect(gateway.request).toHaveBeenCalledTimes(1);
});

it("reconciles a successful rejoin even when React keeps subscribers mounted", async () => {
  const gateway = createTestGateway();
  gateway.request.mockResolvedValue({
    organizationId: "guild-1",
    revision: 1,
    presences: [],
  });

  const { result } = renderHook(() => useMemberWebPresence("guild-1"), {
    wrapper: gateway.wrapper,
  });

  await waitFor(() => expect(result.current?.size).toBe(0));
  expect(gateway.request).toHaveBeenCalledTimes(1);
  act(() => {
    gateway.setConnectionState("disconnected");
    gateway.setConnectionState("ready");
    gateway.deliver({
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "rejoined",
        organizationIds: [],
        subscriptionScopes: [],
      },
    });
  });
  await waitFor(() => expect(gateway.request).toHaveBeenCalledTimes(2));
});

it("keeps a newer live removal when an older snapshot resolves", async () => {
  const gateway = createTestGateway();

  type PresenceSnapshot = ReturnType<typeof decodePresenceSnapshot>;

  let resolveResponse = (_value: PresenceSnapshot): void => {
    throw new Error("Presence request has not started");
  };

  const response = new Promise<PresenceSnapshot>((resolve) => {
    resolveResponse = resolve;
  });

  gateway.request.mockReturnValue(response);

  const { result } = renderHook(() => useMemberWebPresence("guild-1"), {
    wrapper: gateway.wrapper,
  });

  act(() =>
    gateway.deliver({
      v: 1,
      type: "presence.delta",
      data: {
        organizationId: "guild-1",
        revision: 2,
        changes: [
          {
            action: "remove",
            userId: "user-1",
            discordId: "discord-1",
            sessionId: "web-1",
          },
        ],
      },
    }),
  );
  await act(async () =>
    resolveResponse({
      organizationId: "guild-1",
      revision: 2,
      presences: [
        {
          userId: "user-1",
          discordId: "discord-1",
          organizationIds: ["guild-1"],
          sessionId: "web-1",
          platform: "web-app",
          status: "online",
          confidence: "reported",
          isAfk: false,
          lastSeen: 1,
        },
      ],
    }),
  );

  expect(result.current?.has("discord-1")).toBe(false);
});
