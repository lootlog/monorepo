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
  type KillDetailResponseDto,
} from "@lootlog/client/main";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, render, screen } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
} from "vitest";
import { KillDetail } from "./kill-detail";

let detail: KillDetailResponseDto;

let state: "success" | "loading" | "error";

async function renderDetail() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  onTestFinished(() => client.clear());
  client.setQueryData(sessionQueryOptions.queryKey, {
    data: null,
    error: null,
  });
  client.setQueryData(
    getGuildsControllerGetGuildPermissionsQueryKey({ guildId: "guild-1" }),
    [],
  );
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: (input) => {
          const path = new URL(
            input instanceof Request ? input.url : input.toString(),
          ).pathname;

          if (path.endsWith("/participation-confirmations/pending"))
            return Promise.resolve(
              Response.json({ items: [], expiredItems: [] }),
            );

          if (path.endsWith("/timeline"))
            return Promise.resolve(
              Response.json([
                {
                  mapId: "map-1",
                  mapName: "Pradawne Wzgórze",
                  numericMapId: 123,
                  assignments: [],
                  gaps: [],
                },
              ]),
            );

          if (path.endsWith("/loots"))
            return Promise.resolve(Response.json([]));

          if (path.endsWith("/kills/kill-1")) {
            if (state === "loading") return new Promise<Response>(() => {});

            return Promise.resolve(
              state === "error"
                ? Response.json({}, { status: 500 })
                : Response.json(detail),
            );
          }

          throw new Error(`Unexpected request: ${path}`);
        },
      },
    }),
  );
  const root = createRootRoute();

  const route = createRoute({
    getParentRoute: () => root,
    path: "/$guildId/events/$eventId/heroes/$heroId/kills/$killId",
    component: KillDetail,
  });

  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({
      initialEntries: ["/guild-1/events/event-1/heroes/hero-1/kills/kill-1"],
    }),
  });

  await router.load();

  const view = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  if (state === "success")
    await screen.findByRole("heading", { name: detail.kill.heroNpc.npcName });

  return view;
}

await initializeTestTranslations();

beforeEach(() => {
  detail = createDetailData();
  state = "success";
});

afterEach(cleanup);

describe("KillDetail states", () => {
  it("renders the compact loading state", async () => {
    state = "loading";

    const { container } = await renderDetail();

    expect(
      container.querySelectorAll("[data-slot='skeleton']").length,
    ).toBeGreaterThan(0);
    expect(container.firstElementChild?.className).toContain("px-3");
    expect(container.firstElementChild?.className).not.toContain("lg:px-4");
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("uses the same compact page padding as the member view", async () => {
    await renderDetail();

    const main = screen
      .getByRole("heading", { name: "Potulny Berserker" })
      .closest("header")?.parentElement?.parentElement;

    expect(main?.className).toContain("px-3");
    expect(main?.className).toContain("py-3");
    expect(main?.className).not.toContain("lg:px-4");
    expect(main?.className).not.toContain("lg:py-4");
  });

  it("renders the data error state with a route back to the hero", async () => {
    state = "error";

    await renderDetail();

    expect(await screen.findByText("events.killDetail.notFound")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "events.common.backToHero" })
        .getAttribute("href"),
    ).toBe("/guild-1/events/event-1/heroes/hero-1");
  });

  it("renders empty participants and loot states", async () => {
    await renderDetail();

    expect(screen.getByText("events.kills.noParticipants")).toBeTruthy();
    expect(await screen.findByText("events.killDetail.noLoots")).toBeTruthy();
  });

  it("groups participants and maps separately from loots and scoring rules", async () => {
    await renderDetail();

    const contentGrid = screen.getByTestId("kill-detail-content-grid");
    const primaryColumn = screen.getByTestId("kill-detail-primary-column");
    const secondaryColumn = screen.getByTestId("kill-detail-secondary-column");

    expect(contentGrid.className).toContain("2xl:grid-cols");
    await screen.findByText("Pradawne Wzgórze");
    expect(primaryColumn.textContent).toContain(
      "events.killDetail.mapCoverage.title",
    );
    expect(primaryColumn.textContent).not.toContain(
      "events.killDetail.matchingLoots",
    );
    expect(secondaryColumn.textContent).toContain(
      "events.killDetail.matchingLoots",
    );
    expect(secondaryColumn.firstElementChild?.textContent).toContain(
      "events.killDetail.matchingLoots",
    );
  });

  it("passes manual close and long NPC names to the summary", async () => {
    const longNpcName = "Nadzwyczajnie Długa Nazwa Potulnego Berserkera";
    detail = createDetailData({ isManualClose: true, npcName: longNpcName });

    await renderDetail();

    expect(screen.getByRole("heading", { name: longNpcName })).toBeTruthy();
    expect(
      screen.getByLabelText("events.killDetail.manualCloseTitle"),
    ).toBeTruthy();
  });

  it("omits the early comparison when respawn equals the maximum", async () => {
    detail = createDetailData({ respawnDurationSeconds: 7_200 });

    await renderDetail();

    expect(
      screen
        .getByLabelText(/^events.killDetail.respawnTime:/)
        .getAttribute("aria-label"),
    ).not.toContain("events.killDetail.respawnFasterBy");
  });
});

function createDetailData(
  options: {
    isManualClose?: boolean;
    npcName?: string;
    respawnDurationSeconds?: number;
  } = {},
): KillDetailResponseDto {
  return {
    kill: createKill(options),
    eventConfig: {
      scoringMode: "ADVANCED",
      scoringRules: null,
    },
  };
}

function createKill(
  options: {
    isManualClose?: boolean;
    npcName?: string;
    respawnDurationSeconds?: number;
  } = {},
) {
  return {
    id: "kill-1",
    heroNpcId: "hero-1",
    timerCreatedById: null,
    timerCreatedBy: null,
    killedAt: "2026-08-12T09:18:12.000Z",
    minSpawnTimeAtKill: "2026-08-12T08:00:00.000Z",
    maxSpawnTimeAtKill: "2026-08-12T10:00:00.000Z",
    respawnDurationSeconds: options.respawnDurationSeconds ?? 4_692,
    windowDurationSeconds: 7_200,
    resolvedAfterMaxSpawnTimeMs: null,
    isManualClose: options.isManualClose ?? false,
    points: [],
    heroNpc: {
      id: "hero-1",
      npcLvl: 284,
      npcId: 123,
      npcName: options.npcName ?? "Potulny Berserker",
      npcIcon: null,
      event: { id: "event-1", name: "Wakacje", world: "tempest" },
    },
  };
}
