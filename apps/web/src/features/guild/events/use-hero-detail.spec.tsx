// @vitest-environment happy-dom

import { createEventOverview } from "@/lib/testing/event";
import { createTestGateway } from "@/lib/testing/gateway";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { configureApiClients } from "@lootlog/client/transport";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { MemberAssignmentModal } from "./components/dialogs/member-assignment-modal";
import { MapCard } from "./components/maps/map-card";
import { STATUS_STYLES } from "./components/maps/map-status";
import { useHeroDetail } from "./use-hero-detail";

await initializeTestTranslations();

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each(["self", "manager"] as const)(
  "accepts the first %s assignment when the countdown opens without refreshing hero data",
  async (mode) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-25T12:54:59Z"));

    const hero = {
      id: "hero-1",
      npcId: 1,
      npcName: "Heros",
      npcIcon: null,
      npcLvl: 100,
    };

    const map = {
      id: "map-1",
      mapId: 1,
      mapName: "Las",
      locationId: null,
      assignedMembers: [],
    };

    const event = createEventOverview({
      heroNpcs: [hero],
      assignmentTimeoutMinutes: 5,
    });

    const timer = {
      npcId: 1,
      minSpawnTime: "2026-09-25T13:00:00Z",
      maxSpawnTime: "2026-09-25T16:00:00Z",
    };

    const assignments: Request[] = [];

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });

    onTestFinished(() => client.clear());
    onTestFinished(
      configureApiClients({
        main: {
          baseUrl: "https://api.test",
          fetch: async (input, init) => {
            const request = new Request(input, init);
            const path = new URL(request.url).pathname;

            if (request.method === "POST" && path.endsWith("assign")) {
              assignments.push(request);

              return Response.json({});
            }

            if (path.endsWith("/overview")) return Response.json(event);

            if (path.endsWith("/maps"))
              return Response.json({
                eventId: event.id,
                heroNpcs: [{ ...hero, locations: [], maps: [map] }],
              });

            if (path.endsWith("/timers")) return Response.json([timer]);

            if (path.endsWith("/members"))
              return Response.json([
                { id: 7, name: "Gracz", avatar: null, userId: "user-7" },
              ]);

            return Response.json([]);
          },
        },
      }),
    );
    const { wrapper: Gateway } = createTestGateway({ connected: false });
    const root = createRootRoute();

    const route = createRoute({
      getParentRoute: () => root,
      path: "$guildId/events/$eventId/heroes/$heroId",
      component: function HeroAssignments() {
        const detail = useHeroDetail();

        if (detail.status !== "ready" || !detail.heroTimer) return null;

        return (
          <>
            <MapCard
              map={map}
              status="UNASSIGNED"
              style={STATUS_STYLES.UNASSIGNED}
              canManage={false}
              assignmentDisabled={!detail.assignmentAllowed}
              assignmentEnabledAt={detail.assignmentEnabledAt}
              onSelfAssignClick={detail.handleSelfAssignClick}
            />
            <button onClick={() => detail.handleManageClick(map.id)}>
              Select member
            </button>
            {detail.selectedMap && (
              <MemberAssignmentModal
                open={detail.assignmentOpen}
                onOpenChange={detail.setAssignmentOpen}
                mapName={detail.selectedMap.mapName}
                assignedMembers={detail.selectedMap.assignedMembers}
                onAssign={detail.handleAssignFromModal}
                onUnassign={detail.handleUnassignFromModal}
                disabled={!detail.assignmentAllowed}
                enabledAt={detail.assignmentEnabledAt}
              />
            )}
          </>
        );
      },
    });

    const router = createRouter({
      routeTree: root.addChildren([route]),
      history: createMemoryHistory({
        initialEntries: ["/guild-1/events/event-1/heroes/hero-1"],
      }),
    });

    await router.load();
    render(
      <QueryClientProvider client={client}>
        <Gateway>
          <RouterProvider router={router} />
        </Gateway>
      </QueryClientProvider>,
    );

    const selfAssign = await screen.findByRole("button", {
      name: "events.maps.assignSelf",
    });

    expect(selfAssign.hasAttribute("disabled")).toBe(true);

    if (mode === "manager")
      fireEvent.click(screen.getByRole("button", { name: "Select member" }));

    const assignControl =
      mode === "self"
        ? selfAssign
        : await screen.findByRole("button", { name: /Gracz/ });

    expect(assignControl.hasAttribute("disabled")).toBe(true);

    vi.setSystemTime(new Date("2026-09-25T12:55:00Z"));
    await waitFor(
      () => expect(assignControl.hasAttribute("disabled")).toBe(false),
      { timeout: 2000 },
    );
    await act(async () => {
      fireEvent.click(assignControl);
    });
    await waitFor(() => expect(assignments).toHaveLength(1));
    const assignment = assignments[0];

    if (!assignment) throw new Error("Expected an assignment request");
    expect(new URL(assignment.url).pathname).toBe(
      `/guilds/guild-1/events/event-1/maps/map-1/${mode === "self" ? "self-assign" : "assign"}`,
    );

    expect(await assignment.text()).toBe(
      mode === "manager" ? JSON.stringify({ memberId: 7 }) : "",
    );
  },
);
