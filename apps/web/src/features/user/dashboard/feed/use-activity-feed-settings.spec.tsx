// @vitest-environment happy-dom
import { configureApiClients } from "@lootlog/client/transport";
import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  type SettingsDocumentsResponseDtoOutput,
} from "@lootlog/client/main";
import {
  DEFAULT_ACTIVITY_FEED_SETTINGS,
  type ActivityFeedSettings,
} from "@lootlog/domain/activity-feed";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, expect, it, onTestFinished } from "vitest";
import "@/i18n/config";
import { createUserPreferences } from "@/lib/testing/preferences";
import { useActivityFeedSettings } from "./use-activity-feed-settings";

afterEach(cleanup);

const documents = (
  settings: ActivityFeedSettings,
): SettingsDocumentsResponseDtoOutput => ({
  domains: {
    general: {
      effective: { activityFeed: settings },
      layers: [],
      sources: {},
      schemaVersion: 1,
    },
  },
});

it("keeps a queued change visible when an earlier save responds first", async () => {
  const responses: Array<(response: Response) => void> = [];

  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: () =>
          new Promise<Response>((resolve) => {
            responses.push(resolve);
          }),
      },
    }),
  );

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });

  queryClient.setQueryData(
    getUsersControllerGetUserPreferencesQueryKey(),
    createUserPreferences(),
  );
  queryClient.setQueryData(
    getSettingsDocumentsControllerGetPreferencesQueryKey({
      domains: "general",
    }),
    documents(DEFAULT_ACTIVITY_FEED_SETTINGS),
  );

  const { result } = renderHook(() => useActivityFeedSettings(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });

  act(() => result.current.update({ withLootOnly: true }));
  act(() => result.current.update({ paused: true }));
  await waitFor(() => expect(result.current.settings.paused).toBe(true));
  await waitFor(() => expect(responses).toHaveLength(1));

  await act(async () => {
    responses[0]?.(
      Response.json(
        documents({ ...DEFAULT_ACTIVITY_FEED_SETTINGS, withLootOnly: true }),
      ),
    );
  });
  expect(result.current.settings).toMatchObject({
    withLootOnly: true,
    paused: true,
  });

  await waitFor(() => expect(responses).toHaveLength(2));
  await act(async () => {
    responses[1]?.(
      Response.json(
        documents({
          ...DEFAULT_ACTIVITY_FEED_SETTINGS,
          withLootOnly: true,
          paused: true,
        }),
      ),
    );
  });
  expect(result.current.settings).toMatchObject({
    withLootOnly: true,
    paused: true,
  });
});
