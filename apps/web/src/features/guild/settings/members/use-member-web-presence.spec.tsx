// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { BasicPresence } from "@lootlog/client/realtime";
import { createTestGateway } from "@/lib/testing/gateway";
import { isMemberOnlineOnWeb } from "./member-web-presence.utils";
import { useMemberWebPresence } from "./use-member-web-presence";

const presence: BasicPresence = {
  userId: "user-1",
  discordId: "discord-1",
  organizationIds: ["guild-1"],
  sessionId: "session-1",
  platform: "web-app",
  status: "online",
  confidence: "reported",
  isAfk: false,
  lastSeen: 1,
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("fetches initial web presence from the gateway", async () => {
  const gateway = createTestGateway();
  gateway.request.mockResolvedValue({
    organizationId: "guild-1",
    revision: 1,
    presences: [presence],
  });
  const { result } = renderHook(() => useMemberWebPresence("guild-1"), {
    wrapper: gateway.wrapper,
  });
  await waitFor(() =>
    expect(isMemberOnlineOnWeb(result.current, "discord-1")).toBe(true),
  );
  expect(gateway.request).toHaveBeenCalledWith("presence.fetch", {
    organizationId: "guild-1",
    world: undefined,
  });
});

it("applies online and offline web presence updates", async () => {
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
  act(() =>
    gateway.deliver({
      v: 1,
      type: "presence.delta",
      data: {
        organizationId: "guild-1",
        revision: 2,
        changes: [{ action: "upsert", presence }],
      },
    }),
  );
  expect(isMemberOnlineOnWeb(result.current, "discord-1")).toBe(true);
  act(() =>
    gateway.deliver({
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
    }),
  );
  expect(isMemberOnlineOnWeb(result.current, "discord-1")).toBe(false);
});

it("hides the previous Organization presence immediately when switching or leaving it", async () => {
  const gateway = createTestGateway();
  gateway.request
    .mockResolvedValueOnce({
      organizationId: "guild-1",
      revision: 1,
      presences: [presence],
    })
    .mockImplementation(() => new Promise(() => {}));
  type PresenceProps = { guildId: string | undefined };
  const initialProps: PresenceProps = { guildId: "guild-1" };
  const { result, rerender } = renderHook(
    ({ guildId }: PresenceProps) => useMemberWebPresence(guildId),
    { initialProps, wrapper: gateway.wrapper },
  );
  await waitFor(() =>
    expect(isMemberOnlineOnWeb(result.current, "discord-1")).toBe(true),
  );
  rerender({ guildId: "guild-2" });
  expect(result.current).toBeUndefined();
  rerender({ guildId: undefined });
  expect(result.current).toBeUndefined();
});
