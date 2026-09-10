import { configureApiClients } from "@lootlog/client/transport";
import { createNotificationTest } from "../notification-test";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, onTestFinished, describe, expect, it, vi } from "vitest";
import type { StoredNotification } from "@/store/notifications.store";
import { useNotificationGuildMembers } from "./use-notification-guild-members";

let test: ReturnType<typeof createNotificationTest>;

const requests = vi.fn<(request: Request) => Promise<Response>>();

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
    test = createNotificationTest();
    requests.mockReset();
    requests.mockImplementation((request) => {
      const guildId = new URL(request.url).pathname.split("/")[2];

      return Promise.resolve(
        Response.json([
          {
            userId: `member-${guildId}`,
            name: `Member ${guildId}`,
            avatar: null,
            roles: [],
            id: 1,
            guildId,
            type: "MEMBER",
          },
        ]),
      );
    });

    const restore = configureApiClients({
      main: {
        baseUrl: "https://api.example.test",
        fetch: (input, init) => requests(new Request(input, init)),
      },
    });

    onTestFinished(restore);
  });
  it("creates one query per unique guild and exposes member lookups", async () => {
    const notifications = [
      createNotification("notification-1", "guild-1"),
      createNotification("notification-2", "guild-1"),
      createNotification("notification-3", "guild-2"),
    ];

    const { result } = renderHook(
      () => useNotificationGuildMembers(notifications),
      { wrapper: test.wrapper },
    );

    await waitFor(() =>
      expect(result.current["guild-2"]?.["member-guild-2"]).toBeDefined(),
    );
    expect(
      requests.mock.calls
        .map(([request]) => new URL(request.url).pathname)
        .sort(),
    ).toEqual([
      "/guilds/guild-1/members/summary",
      "/guilds/guild-2/members/summary",
    ]);
    expect(result.current["guild-1"]?.["member-guild-1"]?.name).toBe(
      "Member guild-1",
    );
    expect(result.current["guild-2"]?.["member-guild-2"]?.name).toBe(
      "Member guild-2",
    );
  });

  it("keeps lookup references stable when query data is unchanged", async () => {
    const notifications = [createNotification("notification-1", "guild-1")];

    const { result, rerender } = renderHook(
      ({ currentNotifications }) =>
        useNotificationGuildMembers(currentNotifications),
      {
        wrapper: test.wrapper,
        initialProps: { currentNotifications: notifications },
      },
    );

    await waitFor(() =>
      expect(result.current["guild-1"]?.["member-guild-1"]).toBeDefined(),
    );
    const firstResult = result.current;
    const firstGuildMembers = firstResult["guild-1"];

    rerender({ currentNotifications: [...notifications] });

    expect(result.current).toBe(firstResult);
    expect(result.current["guild-1"]).toBe(firstGuildMembers);
  });

  it("forgets checked member identities after their guild leaves the list", async () => {
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
        wrapper: test.wrapper,
        initialProps: {
          currentNotifications: [missingGuildOneMember],
        },
      },
    );

    await waitFor(() =>
      expect(result.current["guild-1"]?.["member-guild-1"]).toBeDefined(),
    );
    const firstGuildMembers = result.current["guild-1"];

    rerender({ currentNotifications: [missingGuildTwoMember] });
    await waitFor(() => expect(result.current["guild-1"]).toBeUndefined());
    rerender({ currentNotifications: [missingGuildOneMember] });

    await waitFor(() => expect(requests).toHaveBeenCalledTimes(3));
    expect(requests.mock.lastCall?.[0].url).toContain(
      "/guilds/guild-1/members/summary",
    );
    expect(result.current["guild-1"]).not.toBe(firstGuildMembers);
  });

  it("bounds checked identities to the unique members in a growing list", async () => {
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
      {
        wrapper: test.wrapper,
        initialProps: { currentNotifications: [firstMissingMember] },
      },
    );

    await waitFor(() =>
      expect(result.current["guild-1"]?.["member-guild-1"]).toBeDefined(),
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
    await waitFor(() => expect(requests).toHaveBeenCalledTimes(2));

    rerender({ currentNotifications: [secondMissingMember] });
    rerender({
      currentNotifications: [firstMissingMember, secondMissingMember],
    });

    await waitFor(() => expect(requests).toHaveBeenCalledTimes(3));
  });
});
