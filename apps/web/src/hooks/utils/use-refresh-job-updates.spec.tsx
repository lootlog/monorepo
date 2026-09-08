// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createTestGateway } from "@/lib/testing/gateway";
import { useRefreshJobUpdates } from "./use-refresh-job-updates";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("delivers only updates for the current organization and stops after unmount", () => {
  const gateway = createTestGateway();
  const received: string[] = [];
  const { rerender, unmount } = renderHook(
    ({ guildId }) =>
      useRefreshJobUpdates(guildId, (update) => received.push(update.guildId)),
    { initialProps: { guildId: "first" }, wrapper: gateway.wrapper },
  );
  const emit = (guildId: string) =>
    act(() => {
      gateway.deliver({
        v: 1,
        type: "member-refresh.updated",
        data: {
          organizationId: guildId,
          payload: {
            guildId,
            jobId: 1,
            status: "COMPLETED",
            totalMembers: 1,
            processedMembers: 1,
            failedMembers: 0,
          },
        },
      });
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
