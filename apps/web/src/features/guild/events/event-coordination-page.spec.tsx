import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Permission } from "@lootlog/schema/permissions";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventCoordinationPage } from "./event-coordination-page";
import type { EventCoordinationResponseDto } from "@lootlog/client/main";

const mocks = vi.hoisted(() => ({
  closeRespawnWindow: vi.fn(),
  getCoordination: vi.fn(),
  selfAssignMember: vi.fn(),
  useGuildPermissions: vi.fn(),
  useParams: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      if (!values) {
        return key;
      }

      return `${key} ${Object.values(values).join(" ")}`;
    },
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({}),
}));

vi.mock("@tanstack/react-router", async () => {
  const React = await import("react");

  return {
    Link: ({ children }: { children: ReactNode }) =>
      React.createElement("a", { href: "#" }, children),
    useParams: mocks.useParams,
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/components/tiles", () => ({
  NpcTile: ({ npc }: { npc: { name: string } }) => (
    <div data-testid="npc-tile">{npc.name}</div>
  ),
}));

vi.mock("@/hooks/api/use-guild-permissions", () => ({
  useGuildPermissions: mocks.useGuildPermissions,
}));

vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  getEventsMonitoringControllerGetCoordinationQueryKey: ({
    guildId,
    eventId,
  }: {
    guildId: string;
    eventId: string;
  }) => ["events", guildId, eventId, "coordination"],
  invalidateEventsMonitoringControllerGetCoordination: vi.fn(),
  useEventsAssignmentControllerSelfAssignMember: mocks.selfAssignMember,
  useEventsMonitoringControllerCloseRespawnWindow: mocks.closeRespawnWindow,
  useEventsMonitoringControllerGetCoordination: mocks.getCoordination,
}));

vi.mock("./components/dialogs/event-action-dialog", () => ({
  EventActionDialog: () => null,
}));

describe("EventCoordinationPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T12:00:00.000Z"));
    vi.clearAllMocks();
    mocks.useParams.mockReturnValue({
      eventId: "event-1",
      guildId: "guild-1",
    });
    mocks.useGuildPermissions.mockReturnValue({
      data: createAccessPolicy({ capabilities: [] }),
    });
    mocks.selfAssignMember.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mocks.closeRespawnWindow.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the loading state", () => {
    mocks.getCoordination.mockReturnValue({
      data: undefined,
      error: null,
      isPending: true,
      refetch: vi.fn(),
    });

    const html = renderPage();

    expect(html).toContain("animate-spin");
  });

  it("renders the empty state", () => {
    mocks.getCoordination.mockReturnValue({
      data: createCoordination([]),
      error: null,
      isPending: false,
      refetch: vi.fn(),
    });

    const html = renderPage();

    expect(html).toContain("events.coordination.empty");
  });

  it("renders the forbidden error state", () => {
    mocks.getCoordination.mockReturnValue({
      data: undefined,
      error: { status: 403 },
      isPending: false,
      refetch: vi.fn(),
    });

    const html = renderPage();

    expect(html).toContain("events.coordination.error");
    expect(html).toContain("common.routeErrors.actions.retry");
  });

  it("renders the normal state with coordinator actions", () => {
    mocks.useGuildPermissions.mockReturnValue({
      data: createAccessPolicy({
        capabilities: [
          Permission.LOOTLOG_EVENTS_WRITE,
          Permission.LOOTLOG_EVENTS_MANAGE,
        ],
      }),
    });
    mocks.getCoordination.mockReturnValue({
      data: createCoordination([createHero()]),
      error: null,
      isPending: false,
      refetch: vi.fn(),
    });

    const html = renderPage();

    expect(html).toContain("events.coordination.title");
    expect(html).toContain("Przykladowy Heros");
    expect(html).toContain("events.coordination.actions.openMaps");
    expect(html).toContain("events.coordination.actions.selfAssign");
    expect(html).toContain("events.coordination.actions.close_window");
  });

  it("disables self assignment and shows a countdown before the assignment window", () => {
    mocks.useGuildPermissions.mockReturnValue({
      data: createAccessPolicy({
        capabilities: [Permission.LOOTLOG_EVENTS_WRITE],
      }),
    });
    mocks.getCoordination.mockReturnValue({
      data: createCoordination([
        createHero({
          maxSpawnTime: "2026-06-19T13:30:00.000Z",
          minSpawnTime: "2026-06-19T13:00:00.000Z",
        }),
      ]),
      error: null,
      isPending: false,
      refetch: vi.fn(),
    });

    const html = renderPage();

    expect(html).toContain('disabled=""');
    expect(html).toContain("events.maps.assignmentDisabledWithTime");
  });
});

function renderPage() {
  return renderToStaticMarkup(<EventCoordinationPage />);
}

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
