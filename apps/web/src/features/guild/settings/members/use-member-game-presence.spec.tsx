// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createTestGateway } from "@/lib/testing/gateway";
import { isMemberOnlineInGame } from "./member-game-presence.utils";
import { useMemberGamePresence } from "./use-member-game-presence";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("keeps current presence visible while a permissions refetch is pending", async () => {
  const gateway = createTestGateway();

  let rejectRefresh = (_reason: Error): void => {
    throw new Error("Refresh has not started");
  };

  gateway.request
    .mockResolvedValueOnce({
      organizationId: "guild-1",
      revision: 1,
      presences: [
        {
          userId: "user-1",
          discordId: "discord-1",
          organizationIds: ["guild-1"],
          platform: "game",
          status: "online",
          confidence: "reported",
          isAfk: false,
          lastSeen: 100,
          sessionId: "session-1",
          character: {
            world: "alpha",
            name: "Hero",
            characterId: "10",
            accountId: "20",
            icon: "hero.png",
            lvl: 123,
            prof: "w",
          },
        },
      ],
    })
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectRefresh = reject;
        }),
    );

  const { result } = renderHook(() => useMemberGamePresence("guild-1"), {
    wrapper: gateway.wrapper,
  });

  await waitFor(() =>
    expect(isMemberOnlineInGame(result.current, "discord-1")).toBe(true),
  );
  act(() =>
    gateway.deliver({
      v: 1,
      type: "permissions.updated",
      data: { organizationIds: [], subscriptionScopes: [] },
    }),
  );
  await waitFor(() => expect(gateway.request).toHaveBeenCalledTimes(2));
  expect(isMemberOnlineInGame(result.current, "discord-1")).toBe(true);
  act(() => rejectRefresh(new Error("Forbidden")));
  await waitFor(() => expect(result.current).toBeUndefined());
});
