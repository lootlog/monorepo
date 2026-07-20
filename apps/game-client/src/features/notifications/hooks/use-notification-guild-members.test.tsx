import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredNotification } from "@/store/notifications.store";
import { useNotificationGuildMembers } from "./use-notification-guild-members";

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  memberDataByGuildId: new Map<
    string,
    Array<{ userId: string; name: string }>
  >(),
  useQueries: vi.fn(
    ({ queries }: { queries: Array<{ queryKey: readonly string[] }> }) => {
      return queries.map(({ queryKey }) => {
        const guildId = queryKey[1];
        let data = mocks.memberDataByGuildId.get(guildId);
        if (!data) {
          data = [
            {
              userId: `member-${queryKey[1]}`,
              name: `Member ${queryKey[1]}`,
            },
          ];
          mocks.memberDataByGuildId.set(guildId, data);
        }
        return { data };
      });
    },
  ),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueries: mocks.useQueries,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock("@/hooks/api/guild-members-summary-query", () => ({
  getGuildMembersSummaryQueryKey: ({ guildId }: { guildId: string }) => [
    "members",
    guildId,
  ],
  getGuildMembersSummaryQueryOptions: ({ guildId }: { guildId: string }) => ({
    queryKey: ["members", guildId],
  }),
}));

const createNotification = (
  notificationId: string,
  guildId: string,
  discordId = `member-${guildId}`,
): StoredNotification => ({
  notificationId,
  discordId,
  guildId,
  world: "pandora",
  createdAt: "2026-04-17T10:00:00.000Z",
  message: "Hej",
  servers: [guildId],
  listKey: notificationId,
  receivedAtMs: 1,
});

describe("useNotificationGuildMembers", () => {
  beforeEach(() => {
    mocks.invalidateQueries.mockClear();
    mocks.useQueries.mockClear();
    mocks.memberDataByGuildId.clear();
  });

  it("creates one query per unique guild and exposes member lookups", () => {
    const notifications = [
      createNotification("notification-1", "guild-1"),
      createNotification("notification-2", "guild-1"),
      createNotification("notification-3", "guild-2"),
    ];

    const { result } = renderHook(() =>
      useNotificationGuildMembers(notifications),
    );

    expect(mocks.useQueries).toHaveBeenCalledWith({
      queries: [
        { queryKey: ["members", "guild-1"] },
        { queryKey: ["members", "guild-2"] },
      ],
    });
    expect(result.current["guild-1"]?.["member-guild-1"]?.name).toBe(
      "Member guild-1",
    );
    expect(result.current["guild-2"]?.["member-guild-2"]?.name).toBe(
      "Member guild-2",
    );
  });

  it("keeps lookup references stable when query data is unchanged", () => {
    const notifications = [createNotification("notification-1", "guild-1")];
    const { result, rerender } = renderHook(
      ({ currentNotifications }) =>
        useNotificationGuildMembers(currentNotifications),
      { initialProps: { currentNotifications: notifications } },
    );
    const firstResult = result.current;
    const firstGuildMembers = firstResult["guild-1"];

    rerender({ currentNotifications: [...notifications] });

    expect(result.current).toBe(firstResult);
    expect(result.current["guild-1"]).toBe(firstGuildMembers);
  });

  it("forgets checked member identities after their guild leaves the list", () => {
    const missingGuildOneMember = createNotification(
      "notification-1",
      "guild-1",
      "missing-member",
    );
    const missingGuildTwoMember = createNotification(
      "notification-2",
      "guild-2",
      "missing-member",
    );
    const { result, rerender } = renderHook(
      ({ currentNotifications }) =>
        useNotificationGuildMembers(currentNotifications),
      {
        initialProps: {
          currentNotifications: [missingGuildOneMember],
        },
      },
    );
    const firstGuildMembers = result.current["guild-1"];

    rerender({ currentNotifications: [missingGuildTwoMember] });
    expect(result.current["guild-1"]).toBeUndefined();
    rerender({ currentNotifications: [missingGuildOneMember] });

    expect(mocks.invalidateQueries).toHaveBeenCalledTimes(3);
    expect(mocks.invalidateQueries).toHaveBeenLastCalledWith({
      queryKey: ["members", "guild-1"],
    });
    expect(result.current["guild-1"]).not.toBe(firstGuildMembers);
  });

  it("bounds checked identities to the unique members in a growing list", () => {
    const firstMissingMember = createNotification(
      "notification-1",
      "guild-1",
      "missing-member-1",
    );
    const secondMissingMember = createNotification(
      "notification-2",
      "guild-1",
      "missing-member-2",
    );
    const { result, rerender } = renderHook(
      ({ currentNotifications }) =>
        useNotificationGuildMembers(currentNotifications),
      { initialProps: { currentNotifications: [firstMissingMember] } },
    );
    const stableLookup = result.current;
    const stableGuildLookup = result.current["guild-1"];

    rerender({
      currentNotifications: [
        firstMissingMember,
        secondMissingMember,
        secondMissingMember,
      ],
    });

    expect(result.current).toBe(stableLookup);
    expect(result.current["guild-1"]).toBe(stableGuildLookup);
    expect(mocks.invalidateQueries).toHaveBeenCalledTimes(2);

    rerender({ currentNotifications: [secondMissingMember] });
    rerender({
      currentNotifications: [firstMissingMember, secondMissingMember],
    });

    expect(mocks.invalidateQueries).toHaveBeenCalledTimes(3);
  });
});
