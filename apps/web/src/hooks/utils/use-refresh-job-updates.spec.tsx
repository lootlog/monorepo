// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import type { RefreshJobUpdate } from "@/types/refresh-job";
import { useRefreshJobUpdates } from "./use-refresh-job-updates";

const gateway = vi.hoisted(() => ({
  listeners: new Set<(update: RefreshJobUpdate) => void>(),
  connected: true,
}));
vi.mock("@/hooks/utils/use-gateway", () => ({
  useGateway: () => ({
    connected: gateway.connected,
    socket: {
      on: (event: string, listener: (update: RefreshJobUpdate) => void) => {
        if (event === GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE)
          gateway.listeners.add(listener);
      },
      off: (_event: string, listener: (update: RefreshJobUpdate) => void) => {
        gateway.listeners.delete(listener);
      },
    },
  }),
}));
afterEach(() => {
  cleanup();
  gateway.listeners.clear();
});

it("delivers only updates for the current organization and stops after unmount", () => {
  const received: string[] = [];
  const { rerender, unmount } = renderHook(
    ({ guildId }) =>
      useRefreshJobUpdates(guildId, (update) => received.push(update.guildId)),
    { initialProps: { guildId: "first" } },
  );
  const emit = (guildId: string) =>
    act(() => {
      gateway.listeners.forEach((listener) =>
        listener({
          guildId,
          jobId: 1,
          status: "COMPLETED",
          totalMembers: 1,
          processedMembers: 1,
          failedMembers: 0,
        }),
      );
    });
  emit("other");
  emit("first");
  rerender({ guildId: "second" });
  emit("first");
  emit("second");
  unmount();
  emit("second");
  expect(received).toEqual(["first", "second"]);
});
