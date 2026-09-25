// @vitest-environment happy-dom

import { NotificationsSettings } from "@/features/guild/notifications/notifications-settings";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { createOrganizationTestRouter } from "@/lib/testing/router";
import {
  getGuildsControllerGetGuildDiscordSyncStatusQueryKey,
  type DiscordGuildSyncStateResponseDto,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { InfoSettings } from "./info";

await initializeTestTranslations();

afterEach(cleanup);

const confirmedPermissions = {
  guildId: "guild-1",
  status: "SYNCED",
  hasRequiredPermissions: true,
  requiredPermissions: ["ViewChannel", "SendMessages"],
  grantedPermissions: ["ViewChannel", "SendMessages"],
  missingPermissions: [],
  channelCount: 1,
  selectableChannelCount: 1,
  lastAttemptAt: "2026-09-25T12:00:00Z",
  lastSuccessAt: "2026-09-25T12:00:00Z",
  lastError: null,
  createdAt: "2026-09-25T12:00:00Z",
  updatedAt: "2026-09-25T12:00:00Z",
} satisfies DiscordGuildSyncStateResponseDto;

const missingPermissions = {
  ...confirmedPermissions,
  hasRequiredPermissions: false,
  grantedPermissions: ["ViewChannel"],
  missingPermissions: ["SendMessages"],
};

const renderSettings = async (
  Component: ComponentType,
  getSync: () => Promise<Response>,
  refresh: () => Promise<Response> = async () =>
    Response.json(confirmedPermissions),
) => {
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input) => {
          const path = new URL(input instanceof Request ? input.url : input)
            .pathname;

          if (path.endsWith("/discord-sync/refresh")) return refresh();

          if (path.endsWith("/discord-sync")) return getSync();

          if (path.endsWith("/rules")) return Response.json({ items: [] });

          if (path.endsWith("/jobs")) {
            return Response.json({ pending: [], history: [] });
          }

          return Response.json([]);
        },
      },
    }),
  );

  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        placeholderData: keepPreviousData,
      },
      mutations: { retry: false },
    },
  });

  onTestFinished(() => client.clear());
  const router = createOrganizationTestRouter(<Component />);
  await router.load();

  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { client, router };
};

const getReinstallButton = () =>
  screen.queryByRole("button", {
    name: "settings.notifications.permissionsBlocked.reinstall",
  });

const refreshSync = () =>
  fireEvent.click(
    screen.getByRole("button", { name: "settings.guildInfo.refresh" }),
  );

describe.each([
  { page: "notifications", Component: NotificationsSettings },
  { page: "Organization info", Component: InfoSettings },
])("$page Discord permissions", ({ Component }) => {
  it("waits for permission evidence before offering a bot reinstall", async () => {
    let finishResponse: ((value: Response) => void) | undefined;

    const response = new Promise<Response>((resolve) => {
      finishResponse = resolve;
    });

    const { client } = await renderSettings(Component, () => response);

    await screen.findByRole("status");
    expect(getReinstallButton()).toBeNull();

    finishResponse?.(Response.json(confirmedPermissions));

    await waitFor(() => expect(client.isFetching()).toBe(0));
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    expect(getReinstallButton()).toBeNull();
  });

  it("recovers a failed status request before presenting confirmed missing permissions", async () => {
    const getSync = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockImplementation(async () => Response.json(missingPermissions));

    await renderSettings(Component, getSync);
    await screen.findByRole("alert");
    expect(getReinstallButton()).toBeNull();

    refreshSync();

    await waitFor(() => expect(getReinstallButton()).not.toBeNull());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(getSync).toHaveBeenCalledTimes(2);
  });

  it.each(["STALE", "SYNCING", "FAILED"] as const)(
    "keeps %s placeholder permissions unknown and supports retrying a failed refresh",
    async (status) => {
      const refresh = vi
        .fn<() => Promise<Response>>()
        .mockResolvedValueOnce(Response.json({}, { status: 503 }))
        .mockImplementation(async () => Response.json(confirmedPermissions));

      const { client } = await renderSettings(
        Component,
        async () =>
          Response.json({
            ...missingPermissions,
            status,
            lastSuccessAt: null,
          }),
        refresh,
      );

      await waitFor(() => expect(client.isFetching()).toBe(0));
      expect(getReinstallButton()).toBeNull();
      refreshSync();

      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(client.isMutating()).toBe(0));
      await screen.findByRole("alert");
      expect(getReinstallButton()).toBeNull();
      refreshSync();

      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(client.isMutating()).toBe(0));
      expect(getReinstallButton()).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
    },
  );

  it("trusts the last successful sync after the snapshot becomes stale", async () => {
    const { client } = await renderSettings(Component, async () =>
      Response.json({ ...confirmedPermissions, status: "STALE" }),
    );

    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(getReinstallButton()).toBeNull();
  });

  it("keeps permissions unknown after a failed Discord read of a previously synced server", async () => {
    await renderSettings(Component, async () =>
      Response.json({
        ...missingPermissions,
        status: "STALE",
        lastError: "fetchChannels: Discord unavailable",
      }),
    );

    await screen.findByRole("alert");
    expect(getReinstallButton()).toBeNull();
  });

  it("stops trusting cached permissions after a background status request fails", async () => {
    const getSync = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(Response.json(confirmedPermissions))
      .mockImplementation(async () => Response.json({}, { status: 503 }));

    const { client } = await renderSettings(Component, getSync);

    await waitFor(() => expect(client.isFetching()).toBe(0));
    await client.invalidateQueries({
      queryKey: getGuildsControllerGetGuildDiscordSyncStatusQueryKey({
        guildId: "guild-1",
      }),
    });

    await screen.findByRole("alert");
    expect(getReinstallButton()).toBeNull();
  });

  it.each(["SYNCED", "NOT_FOUND"] as const)(
    "does not reuse %s permission evidence when switching Organizations",
    async (status) => {
      let finishResponse: ((value: Response) => void) | undefined;

      const nextOrganization = new Promise<Response>((resolve) => {
        finishResponse = resolve;
      });

      const getSync = vi
        .fn<() => Promise<Response>>()
        .mockResolvedValueOnce(
          Response.json({ ...confirmedPermissions, status }),
        )
        .mockImplementation(() => nextOrganization);

      const { client, router } = await renderSettings(Component, getSync);

      await waitFor(() => expect(client.isFetching()).toBe(0));
      router.history.push("/guild-2");
      await waitFor(() => expect(getSync).toHaveBeenCalledTimes(2));
      await screen.findByRole("status");
      expect(getReinstallButton()).toBeNull();

      finishResponse?.(
        Response.json({ ...confirmedPermissions, guildId: "guild-2" }),
      );

      await waitFor(() => expect(client.isFetching()).toBe(0));
      await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
      expect(getReinstallButton()).toBeNull();
    },
  );

  it("does not carry a failed refresh into another Organization", async () => {
    const getSync = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(
        Response.json({ ...missingPermissions, status: "STALE" }),
      )
      .mockImplementation(async () =>
        Response.json({ ...confirmedPermissions, guildId: "guild-2" }),
      );

    const { client, router } = await renderSettings(
      Component,
      getSync,
      async () => Response.json({}, { status: 503 }),
    );

    await waitFor(() => expect(client.isFetching()).toBe(0));
    refreshSync();
    await screen.findByRole("alert");
    router.history.push("/guild-2");

    await waitFor(() => expect(getSync).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.queryByRole("status")).toBeNull();
    expect(getReinstallButton()).toBeNull();
  });

  it("accepts a successful status retry after both a refresh and a background read fail", async () => {
    const getSync = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(
        Response.json({ ...missingPermissions, status: "STALE" }),
      )
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockImplementation(async () => Response.json(confirmedPermissions));

    const { client } = await renderSettings(Component, getSync, async () =>
      Response.json({}, { status: 503 }),
    );

    await waitFor(() => expect(client.isFetching()).toBe(0));
    refreshSync();
    await screen.findByRole("alert");
    await client.invalidateQueries({
      queryKey: getGuildsControllerGetGuildDiscordSyncStatusQueryKey({
        guildId: "guild-1",
      }),
    });
    await waitFor(() => expect(getSync).toHaveBeenCalledTimes(2));
    refreshSync();

    await waitFor(() => expect(getSync).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.queryByRole("status")).toBeNull();
    expect(getReinstallButton()).toBeNull();
  });

  it("accepts a newer background status success after a refresh fails", async () => {
    const getSync = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(
        Response.json({ ...missingPermissions, status: "STALE" }),
      )
      .mockImplementation(async () => Response.json(confirmedPermissions));

    const { client } = await renderSettings(Component, getSync, async () =>
      Response.json({}, { status: 503 }),
    );

    await waitFor(() => expect(client.isFetching()).toBe(0));
    refreshSync();
    await screen.findByRole("alert");
    await client.invalidateQueries({
      queryKey: getGuildsControllerGetGuildDiscordSyncStatusQueryKey({
        guildId: "guild-1",
      }),
    });

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.queryByRole("status")).toBeNull();
    expect(getReinstallButton()).toBeNull();
  });

  it("offers installation when Discord confirms the bot cannot access the server", async () => {
    await renderSettings(Component, async () =>
      Response.json({ ...missingPermissions, status: "NOT_FOUND" }),
    );

    await waitFor(() => expect(getReinstallButton()).not.toBeNull());
  });
});

it("enables notification configuration only while Discord permissions are confirmed", async () => {
  let finishResponse: ((value: Response) => void) | undefined;

  const firstResponse = new Promise<Response>((resolve) => {
    finishResponse = resolve;
  });

  const getSync = vi
    .fn<() => Promise<Response>>()
    .mockImplementationOnce(() => firstResponse)
    .mockImplementation(async () => Response.json({}, { status: 503 }));

  const { client } = await renderSettings(NotificationsSettings, getSync);

  const addTargetButtons = await screen.findAllByRole<HTMLButtonElement>(
    "button",
    { name: "settings.notifications.actions.addTarget" },
  );

  expect(addTargetButtons.every((button) => button.disabled)).toBe(true);
  finishResponse?.(Response.json(confirmedPermissions));
  await waitFor(() =>
    expect(addTargetButtons.every((button) => !button.disabled)).toBe(true),
  );

  await client.invalidateQueries({
    queryKey: getGuildsControllerGetGuildDiscordSyncStatusQueryKey({
      guildId: "guild-1",
    }),
  });

  await screen.findByRole("alert");
  expect(addTargetButtons.every((button) => button.disabled)).toBe(true);
  expect(getReinstallButton()).toBeNull();
});

it("keeps the Organization info refresh action mounted while a refresh runs", async () => {
  let finishRefresh: ((value: Response) => void) | undefined;

  const refresh = new Promise<Response>((resolve) => {
    finishRefresh = resolve;
  });

  const { client } = await renderSettings(
    InfoSettings,
    async () => Response.json(confirmedPermissions),
    () => refresh,
  );

  await waitFor(() => expect(client.isFetching()).toBe(0));

  const refreshButton = screen.getByRole("button", {
    name: "settings.guildInfo.refresh",
  });

  fireEvent.click(refreshButton);
  await waitFor(() => expect(client.isMutating()).toBe(1));
  expect(refreshButton.isConnected).toBe(true);
  expect(screen.queryByRole("status")).toBeNull();

  finishRefresh?.(Response.json(confirmedPermissions));
  await waitFor(() => expect(client.isMutating()).toBe(0));
  expect(refreshButton.isConnected).toBe(true);
});
