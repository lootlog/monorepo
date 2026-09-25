import { createOrganizationTestWrapper } from "@/lib/testing/router";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import { getNpcsControllerGetNpcsQueryKey } from "@lootlog/client/search";
import {
  getNotificationsGuildControllerGetGuildRulesQueryKey,
  type NotificationRuleResponseDto,
} from "@lootlog/client/main";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { createContext, useContext, type ReactNode } from "react";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { useNotificationRuleForm } from "./use-notification-rule-form";

await initializeTestTranslations();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const scheduledRule = {
  id: 1,
  ownerType: "GUILD",
  ownerId: "test-org",
  guildId: "test-org",
  world: null,
  name: "Original rule",
  triggerType: "SCHEDULED_MESSAGE",
  filters: null,
  contentTemplate: "Original message",
  scheduleStrategy: "FIXED_DATETIME",
  scheduleAnchor: null,
  scheduleOffsetMinutes: null,
  scheduledAt: "2099-09-02T10:00:00.000Z",
  scheduleIntervalType: "ONCE",
  scheduleIntervalValue: null,
  scheduleWeekday: null,
  scheduleTimeOfDay: null,
  scheduledUntil: null,
  scheduleTimezone: "Europe/Warsaw",
  enabled: true,
  dedupeWindowSeconds: 0,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  targets: [],
} satisfies NotificationRuleResponseDto;

const renderEditedRule = async (
  overrides: Partial<NotificationRuleResponseDto> = {},
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const requests: Request[] = [];

  const rules = [
    { ...scheduledRule, ...overrides },
    { ...scheduledRule, id: 2, name: "Second rule" },
  ];

  onTestFinished(() => client.clear());
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input, init) => {
          const request = new Request(input, init);
          const url = new URL(request.url);

          if (request.method === "PATCH") {
            requests.push(request);

            return Response.json(scheduledRule);
          }

          if (url.pathname.endsWith("/rules")) {
            return Response.json({ items: rules });
          }

          return Response.json([]);
        },
      },
      search: {
        baseUrl: "https://search.test",
        fetch: async () => Response.json([]),
      },
    }),
  );

  const TestContent = createContext<ReactNode>(null);
  const root = createRootRoute();

  const editRoute = createRoute({
    getParentRoute: () => root,
    path: "$guildId/notifications/$ruleId",
    component: function RuleEditor() {
      return useContext(TestContent);
    },
  });

  const listRoute = createRoute({
    getParentRoute: () => root,
    path: "$guildId/notifications",
  });

  const router = createRouter({
    routeTree: root.addChildren([editRoute, listRoute]),
    history: createMemoryHistory({
      initialEntries: ["/test-org/notifications/1"],
    }),
    defaultPendingMinMs: 0,
  });

  await router.load();

  const hook = renderHook(useNotificationRuleForm, {
    wrapper: ({ children }) => (
      <TestContent.Provider value={children}>
        <QueryClientProvider client={client}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </TestContent.Provider>
    ),
  });

  await waitFor(() =>
    expect(hook.result.current.form.getValues("name")).toBe("Original rule"),
  );

  return { ...hook, client, router, requests, rules };
};

it.each([
  {
    interval: "DAILY" as const,
    schedule: { scheduleTimeOfDay: "18:30" },
  },
  {
    interval: "WEEKLY" as const,
    schedule: {
      scheduleTimeOfDay: "18:30",
      scheduleWeekday: 3,
    },
  },
  {
    interval: "HOURLY" as const,
    schedule: {
      scheduledAt: "2099-09-02T10:00:00.000Z",
      scheduleIntervalValue: 2,
    },
  },
  {
    interval: "ONCE" as const,
    schedule: { scheduledAt: "2099-09-02T10:00:00.000Z" },
  },
])(
  "submits only visible schedule values for $interval",
  async ({ interval, schedule }) => {
    const { result, requests } = await renderEditedRule();

    act(() => {
      result.current.form.setValue("scheduleIntervalType", interval);
      result.current.form.setValue("scheduleTimeOfDay", "18:30");
      result.current.form.setValue("scheduleWeekday", "3");
      result.current.form.setValue("scheduleIntervalValue", "2");
      result.current.form.setValue(
        "scheduledUntil",
        interval === "ONCE" ? "2099-10-01T12:00" : "",
      );
      result.current.form.setValue("targetIds", ["9"]);
    });

    await act(() =>
      result.current.form.handleSubmit(result.current.handleSubmit)(),
    );

    expect(requests).toHaveLength(1);
    expect(await requests[0]?.json()).toEqual({
      name: "Original rule",
      contentTemplate: "Original message",
      triggerType: "SCHEDULED_MESSAGE",
      targetIds: [9],
      enabled: true,
      scheduleIntervalType: interval,
      scheduleTimezone: "Europe/Warsaw",
      ...schedule,
    });
  },
);

it("sends an explicit clear when a saved recurring end date is removed", async () => {
  const { result, requests } = await renderEditedRule({
    scheduleIntervalType: "DAILY",
    scheduleTimeOfDay: "12:00",
    scheduledUntil: "2099-10-01T10:00:00.000Z",
  });

  expect(result.current.form.getValues("scheduledUntil")).toBe(
    "2099-10-01T12:00",
  );
  act(() => {
    result.current.form.setValue("scheduledUntil", "", { shouldDirty: true });
    result.current.form.setValue("targetIds", ["9"]);
  });
  await act(() =>
    result.current.form.handleSubmit(result.current.handleSubmit)(),
  );

  expect(requests).toHaveLength(1);
  expect(await requests[0]?.json()).toMatchObject({ scheduledUntil: null });
});

it("preserves edited fields and refreshes untouched fields across rule refetches", async () => {
  const { result, client, router, rules } = await renderEditedRule();

  act(() => {
    result.current.form.setValue("name", "Unsaved name", { shouldDirty: true });
    result.current.form.setValue("contentTemplate", "Unsaved content", {
      shouldDirty: true,
    });
    result.current.setNpcSearch("smok");
  });

  act(() => {
    client.setQueryData(
      getNotificationsGuildControllerGetGuildRulesQueryKey({
        guildId: "test-org",
      }),
      {
        items: [
          {
            ...scheduledRule,
            name: "Changed remotely",
            scheduledAt: "2099-09-03T10:00:00.000Z",
          },
          rules[1],
        ],
      },
    );
  });

  await waitFor(() =>
    expect(result.current.rule?.name).toBe("Changed remotely"),
  );
  expect(result.current.form.getValues()).toMatchObject({
    name: "Unsaved name",
    contentTemplate: "Unsaved content",
    scheduledAt: "2099-09-03T12:00",
  });
  expect(result.current.npcSearch).toBe("smok");

  act(() => router.history.push("/test-org/notifications/2"));

  await waitFor(() =>
    expect(result.current.form.getValues("name")).toBe("Second rule"),
  );
  expect(result.current.form.getValues("contentTemplate")).toBe(
    "Original message",
  );
  expect(result.current.npcSearch).toBe("");
});

it("lets a recovered NPC search replace a failed selected-label lookup", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const restore = configureApiClients({
    main: { baseUrl: "https://api.test" },
    search: { baseUrl: "https://search.test" },
  });

  const npc = { id: 2, name: "Smok", type: "HERO" };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input);

      if (url.pathname === "/npcs") {
        if (url.searchParams.get("search") === "smok") {
          return Response.json([npc]);
        }

        return Response.json(
          { _tag: "SearchUnavailable", message: "Search unavailable" },
          { status: 503 },
        );
      }

      if (url.pathname.endsWith("/rules")) {
        return Response.json({ items: [] });
      }

      return Response.json([]);
    }),
  );

  const RouterWrapper = await createOrganizationTestWrapper("/test-org");

  try {
    const { result } = renderHook(useNotificationRuleForm, {
      wrapper: ({ children }) => (
        <RouterWrapper>
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </RouterWrapper>
      ),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.form.setValue("npcIds", ["1"]));
    await waitFor(() =>
      expect(result.current.npcSearchError).toBe("common.searchUnavailable"),
    );

    act(() => result.current.setNpcSearch("missing"));
    await waitFor(() =>
      expect(result.current.searchedNpcQuery.isError).toBe(true),
    );
    expect(result.current.npcSearchError).toBe("common.searchUnavailable");

    act(() => result.current.setNpcSearch("smok"));
    await waitFor(() =>
      expect(result.current.searchedNpcQuery.isSuccess).toBe(true),
    );
    expect(
      client.getQueryState(
        getNpcsControllerGetNpcsQueryKey({
          ids: [1],
          world: undefined,
        }),
      )?.status,
    ).toBe("error");
    expect(result.current.npcOptions).toEqual([
      { value: "2", label: "Smok npcType.HERO (#2)" },
    ]);
    expect(result.current.npcSearchError).toBeUndefined();

    act(() => result.current.setNpcSearch(""));
    expect(result.current.npcSearchError).toBe("common.searchUnavailable");
    act(() => result.current.handleManualNpcEntryChange(true));
    expect(result.current.npcSearchError).toBeUndefined();
    act(() => {
      result.current.handleManualNpcEntryChange(false);
      result.current.form.setValue("npcIds", []);
    });
    expect(result.current.npcSearchError).toBeUndefined();
  } finally {
    cleanup();
    client.clear();
    restore();
  }
});
