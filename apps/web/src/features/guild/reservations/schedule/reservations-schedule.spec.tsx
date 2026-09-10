// @vitest-environment happy-dom
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { GatewayContext } from "@/contexts/gateway-context";
import { GatewayClient } from "@/lib/gateway-client";
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
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "sonner";
import { ReservationsSchedule } from "./reservations-schedule";

await initializeTestTranslations();

const now = new Date(2026, 0, 1, 12, 7, 30);

const settings = {
  reservationActiveLimitPerSpot: 3,
  reservationMaxAdvanceDays: 7,
  reservationMaxDurationMinutes: 180,
  reservationMinDurationMinutes: 30,
  reservationTimeGranularityMinutes: 15,
};

const interval = (startsAt: Date, endsAt: Date, isCurrent = true, id = 1) => ({
  id,
  spotId: "driady",
  spotName: "Driady",
  startsAt: startsAt.toISOString(),
  endsAt: endsAt.toISOString(),
  createdAt: now.toISOString(),
  comment: null,
  sourceOrganization: {
    isCurrent,
    name: "Organization",
    iconUrl: null,
    calendarPath: "/guild-1/reservations/driady",
  },
  author: { displayName: "Cached author", avatarUrl: null },
  isMine: true,
  canEdit: true,
  canCancel: true,
  reminderMinutesBefore: null,
  editingConstraints: settings,
});

let restoreClient = () => {};

let client: QueryClient;

const nativeMatchMedia = window.matchMedia.bind(window);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  vi.stubGlobal("matchMedia", (query: string) => {
    const result = nativeMatchMedia(query);
    Object.defineProperty(result, "matches", { value: true });

    return result;
  });
});

afterEach(() => {
  cleanup();
  client?.clear();
  restoreClient();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const renderSchedule = async (
  availability: (request: Request) => Promise<Response>,
  calendarItems: ReturnType<typeof interval>[] = [],
  laterCalendar?: (request: Request) => Promise<Response>,
) => {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
    },
  });
  client.setQueryData(sessionQueryOptions.queryKey, {
    data: null,
    error: null,
  });
  restoreClient = configureApiClients({
    main: { baseUrl: "https://api.test" },
  });
  const requests: URL[] = [];
  const writes: string[] = [];
  let calendarRequests = 0;
  vi.stubGlobal(
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);

      if (request.method === "POST") {
        writes.push(await request.text());

        return Response.json(
          interval(new Date(2026, 0, 1, 13), new Date(2026, 0, 1, 13, 30)),
        );
      }

      if (url.pathname.endsWith("/reservation-spots/driady/reservations")) {
        requests.push(url);

        if (
          url.searchParams.get("from") ===
          new Date(2026, 0, 1, 12, 15).toISOString()
        )
          return availability(request);
        calendarRequests += 1;

        if (calendarRequests > 1 && laterCalendar)
          return laterCalendar(request);

        return Response.json({ items: calendarItems });
      }

      if (url.pathname === "/guilds/guild-1")
        return Response.json({
          id: "guild-1",
          name: "Organization",
          ownerId: "owner",
          ...settings,
        });

      if (url.pathname.endsWith("/reservation-spots"))
        return Response.json([{ id: "driady", name: "Driady" }]);

      return Response.json([]);
    },
  );
  const root = createRootRoute();

  const authenticated = createRoute({
    getParentRoute: () => root,
    id: "_authenticated",
  });

  const guild = createRoute({
    getParentRoute: () => authenticated,
    path: "$guildId",
  });

  const reservations = createRoute({
    getParentRoute: () => guild,
    path: "reservations",
  });

  const route = createRoute({
    getParentRoute: () => reservations,
    path: "$reservationId",
    component: ReservationsSchedule,
  });

  const router = createRouter({
    routeTree: root.addChildren([
      authenticated.addChildren([
        guild.addChildren([reservations.addChildren([route])]),
      ]),
    ]),
    history: createMemoryHistory({
      initialEntries: ["/guild-1/reservations/driady"],
    }),
  });

  await router.load();
  render(
    <QueryClientProvider client={client}>
      <GatewayContext
        value={{
          socket: new GatewayClient(),
          connected: false,
          joined: false,
          lootUnreadCounts: {},
        }}
      >
        <RouterProvider router={router} />
        <Toaster />
      </GatewayContext>
    </QueryClientProvider>,
  );
  await screen.findByRole("heading", { name: "Driady" });
  await waitFor(() => expect(requests.length).toBeGreaterThan(0));

  return { requests, writes };
};

const action = () =>
  screen.getByRole<HTMLButtonElement>("button", {
    name: "reservations.schedule.header.findNearestSlot",
  });

const swipe = async (direction: -1 | 1) => {
  const grid = document.querySelector(
    '[data-slot="mobile-day-current"] > .relative',
  );

  const surface = document.querySelector(
    '[data-slot="mobile-day-swipe-surface"]',
  );

  if (!(grid instanceof HTMLDivElement) || !(surface instanceof HTMLDivElement))
    throw new Error("Mobile schedule missing");
  vi.spyOn(surface, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 390, 800),
  );
  fireEvent.touchStart(grid, {
    touches: [{ clientX: 200, clientY: 400, identifier: 1 }],
  });
  fireEvent.touchMove(grid, {
    touches: [{ clientX: 200 - direction * 100, clientY: 401, identifier: 1 }],
  });
  fireEvent.touchEnd(grid, {
    changedTouches: [
      { clientX: 200 - direction * 100, clientY: 401, identifier: 1 },
    ],
    touches: [],
  });
  await act(
    async () => new Promise<void>((resolve) => setTimeout(resolve, 250)),
  );
};

describe("ReservationsSchedule nearest free slot", () => {
  it("ignores partner reservations while finding the nearest local range", async () => {
    const { requests, writes } = await renderSchedule(async () =>
      Response.json({
        items: [
          interval(new Date(2026, 0, 1, 12), new Date(2026, 0, 2, 9), false, 2),
          interval(new Date(2026, 0, 1, 12, 30), new Date(2026, 0, 1, 13)),
        ],
      }),
    );

    fireEvent.click(action());
    await screen.findByRole("dialog");
    expect(requests[requests.length - 1]?.searchParams.get("from")).toBe(
      new Date(2026, 0, 1, 12, 15).toISOString(),
    );
    expect(requests[requests.length - 1]?.searchParams.get("to")).toBe(
      new Date(2026, 0, 8, 12, 30).toISOString(),
    );
    fireEvent.click(screen.getByRole("button", { name: "common.save" }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(JSON.parse(writes[0] ?? "")).toMatchObject({
      startsAt: new Date(2026, 0, 1, 13).toISOString(),
      endsAt: new Date(2026, 0, 1, 13, 30).toISOString(),
    });
  });
  it("shows distinct feedback for no availability and request failures", async () => {
    let count = 0;
    await renderSchedule(async () =>
      ++count === 1
        ? Response.json({ items: [interval(now, new Date(2026, 0, 8, 13))] })
        : Response.json({ message: "offline" }, { status: 503 }),
    );
    fireEvent.click(action());
    await screen.findByText(
      "reservations.schedule.nearestFreeSlot.unavailable",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(action());
    await screen.findByText("reservations.schedule.nearestFreeSlot.error");
  });
  it("prevents duplicate availability requests while one is pending", async () => {
    let resolveRequest: ((response: Response) => void) | undefined;
    let count = 0;
    await renderSchedule(() => {
      count += 1;

      return new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      });
    });
    const button = action();
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(count).toBe(1));
    expect(button.disabled).toBe(true);
    resolveRequest?.(Response.json({ items: [] }));
    await screen.findByRole("dialog");
    expect(button.disabled).toBe(false);
  });
  it("moves exactly one day on swipe and keeps prior week data available", async () => {
    const { requests } = await renderSchedule(async () =>
      Response.json({ items: [] }),
    );

    const navigation = () =>
      document.querySelector('[data-slot="schedule-date-navigation"]')
        ?.textContent;

    const original = navigation();
    await swipe(1);
    expect(navigation()).toContain("2 sty");
    await swipe(-1);
    expect(navigation()).toBe(original);
    expect(requests).toHaveLength(1);
  });
  it("requests the adjacent week and keeps cached reservations until it arrives", async () => {
    let completeNextWeek: ((response: Response) => void) | undefined;

    const { requests } = await renderSchedule(
      async () => Response.json({ items: [] }),
      [interval(new Date(2026, 0, 5, 10), new Date(2026, 0, 5, 11))],
      () =>
        new Promise<Response>((resolve) => {
          completeNextWeek = resolve;
        }),
    );

    await swipe(1);
    await swipe(1);
    await swipe(1);
    await swipe(1);
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]?.searchParams.get("from")).toBe(
      new Date(2026, 0, 4).toISOString(),
    );
    expect(requests[1]?.searchParams.get("to")).toBe(
      new Date(2026, 0, 13).toISOString(),
    );
    expect(screen.getAllByText("Cached author").length).toBeGreaterThan(0);
    completeNextWeek?.(Response.json({ items: [] }));
    await waitFor(() =>
      expect(screen.queryAllByText("Cached author")).toHaveLength(0),
    );
  });
});
