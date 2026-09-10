// @vitest-environment happy-dom
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { act, cleanup, render } from "@testing-library/react";
import { Permission } from "@lootlog/schema/permissions";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  onTestFinished,
} from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  type EventCoordinationResponseDto,
} from "@lootlog/client/main";
import { EventCoordinationPage } from "./event-coordination-page";

await initializeTestTranslations({});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-19T12:00:00.000Z"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function renderPage(
  data: EventCoordinationResponseDto | "loading" | "forbidden",
  capabilities: Permission[] = [],
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  onTestFinished(() => client.clear());
  client.setQueryData(
    getGuildsControllerGetGuildPermissionsQueryKey({ guildId: "guild-1" }),
    capabilities,
  );
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: () =>
          data === "loading"
            ? new Promise<Response>(() => {})
            : Promise.resolve(
                data === "forbidden"
                  ? Response.json({}, { status: 403 })
                  : Response.json(data),
              ),
      },
    }),
  );
  const root = createRootRoute();

  const route = createRoute({
    getParentRoute: () => root,
    path: "/$guildId/events/$eventId/coordination",
    component: EventCoordinationPage,
  });

  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({
      initialEntries: ["/guild-1/events/event-1/coordination"],
    }),
  });

  await router.load();

  const { container } = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  await act(() => vi.advanceTimersByTimeAsync(0));

  return container.innerHTML;
}

describe("EventCoordinationPage", () => {
  it("renders the loading state", async () => {
    expect(await renderPage("loading")).toContain("animate-spin");
  });
  it("renders the empty state", async () => {
    expect(await renderPage(createCoordination([]))).toContain(
      "events.coordination.empty",
    );
  });
  it("renders the forbidden error state", async () => {
    const html = await renderPage("forbidden");
    expect(html).toContain("events.coordination.error");
    expect(html).toContain("common.routeErrors.actions.retry");
  });
  it("renders the normal state with coordinator actions", async () => {
    const html = await renderPage(createCoordination([createHero()]), [
      Permission.LOOTLOG_EVENTS_WRITE,
      Permission.LOOTLOG_EVENTS_MANAGE,
    ]);

    expect(html).toContain("events.coordination.title");
    expect(html).toContain("Przykladowy Heros");
    expect(html).toContain("events.coordination.actions.openMaps");
    expect(html).toContain("events.coordination.actions.selfAssign");
    expect(html).toContain("events.coordination.actions.close_window");
  });
  it("disables self assignment and shows a countdown before the assignment window", async () => {
    const html = await renderPage(
      createCoordination([
        createHero({
          maxSpawnTime: "2026-06-19T13:30:00.000Z",
          minSpawnTime: "2026-06-19T13:00:00.000Z",
        }),
      ]),
      [Permission.LOOTLOG_EVENTS_WRITE],
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain("events.maps.assignmentDisabledWithTime");
  });
});

function createCoordination(
  heroes: EventCoordinationResponseDto["heroes"],
): EventCoordinationResponseDto {
  return {
    assignmentTimeoutMinutes: 5,
    eventId: "event-1",
    generatedAt: "2026-06-19T12:00:00.000Z",
    heroes,
    summary: {
      coveredMaps: heroes.reduce((total, hero) => {
        return total + hero.coverage.coveredMaps;
      }, 0),
      criticalCount: heroes.filter((hero) => hero.priority === "CRITICAL")
        .length,
      nextSpawnAt: "2026-06-19T12:10:00.000Z",
      totalMaps: heroes.reduce((total, hero) => {
        return total + hero.coverage.totalMaps;
      }, 0),
      warningCount: heroes.filter((hero) => hero.priority === "WARNING").length,
    },
    world: "pandora",
  };
}

function createHero(
  timerOverrides: Partial<
    NonNullable<EventCoordinationResponseDto["heroes"][number]["timer"]>
  > = {},
): EventCoordinationResponseDto["heroes"][number] {
  return {
    activeGaps: [
      {
        durationSeconds: 120,
        gapType: "UNASSIGNED",
        id: "gap-1",
        mapId: "map-1",
        mapName: "Mapa 1",
        numericMapId: 1,
        startedAt: "2026-06-19T11:58:00.000Z",
      },
    ],
    coverage: {
      activeGapCount: 1,
      assignedMaps: 1,
      coveredMaps: 0,
      totalMaps: 2,
      unassignedMaps: 1,
      uncoveredMaps: 1,
    },
    heroId: "hero-1",
    npcIcon: null,
    npcId: 123,
    npcLvl: 50,
    npcName: "Przykladowy Heros",
    priority: "CRITICAL",
    recommendedAction: "CLOSE_WINDOW",
    timer: {
      maxSpawnTime: "2026-06-19T12:05:00.000Z",
      minSpawnTime: "2026-06-19T12:00:00.000Z",
      npcId: 123,
      overdueMs: null,
      status: "OPEN",
      world: "pandora",
      ...timerOverrides,
    },
  };
}
