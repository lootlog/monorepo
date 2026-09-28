import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it } from "vitest";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { createGameAccessCache } from "@/lib/game-access-cache";
import { createTimerHttpFixture } from "@/features/timers/timer-http-fixtures";
import { createTimerGuildFixture } from "@/features/timers/timer-fixtures";
import { queryKeys } from "@/features/public-api/query-keys";
import { useAccessibleGuilds } from "./use-accessible-guilds";

const policy = (ids: string[]) =>
  createAccessPolicySnapshot(
    ids.map((id) => ({
      guild: { id, ownerId: "owner" },
      roles: [
        {
          permissions: [Permission.LOOTLOG_ACCESS],
          lvlRangeFrom: 0,
          lvlRangeTo: 500,
        },
      ],
    })),
    "reader",
  );

it.each([false, true])(
  "finishes the initial guild request once and removes revoked metadata (missing grant: %s)",
  async (missingGrant) => {
    const response = Promise.withResolvers<Response>();
    const guild = createTimerGuildFixture({ id: "a" });
    const added = createTimerGuildFixture({ id: "b" });
    let initial = true;

    const fixture = createTimerHttpFixture(() => {
      if (initial) {
        initial = false;

        return response.promise;
      }

      return Response.json([guild, added]);
    });

    fixture.queryClient.removeQueries({ queryKey: queryKeys.guilds() });
    const access = createGameAccessCache(fixture.queryClient);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={fixture.queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result, unmount } = renderHook(() => useAccessibleGuilds(), {
      wrapper,
    });

    try {
      await waitFor(() => expect(fixture.requests).toHaveLength(1));
      act(() =>
        access.apply({
          accessPolicy: policy(missingGrant ? ["a", "b"] : ["a"]),
        }),
      );
      expect(fixture.requests).toHaveLength(1);
      response.resolve(
        Response.json([guild, createTimerGuildFixture({ id: "removed" })]),
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.map(({ id }) => id)).toEqual(
        missingGrant ? ["a", "b"] : ["a"],
      );
      expect(fixture.requests).toHaveLength(missingGrant ? 2 : 1);
    } finally {
      unmount();
      access.dispose();
      fixture.cleanup();
    }
  },
);
