import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Game } from "@/lib/game";
import { useEventModeSelectionStore } from "@/store/event-mode-selection.store";
import { EventMode } from "./event-mode";

const mocks = vi.hoisted(() => ({
  query: {
    data: undefined as ReturnType<typeof createResponse> | undefined,
    dataUpdatedAt: 0,
    enabled: true,
    isError: false,
    margonemAccountId: "account-1",
    normalizedWorld: "tempest",
  },
}));

vi.mock("./use-event-mode-query", () => ({
  useEventModeQuery: () => mocks.query,
}));

vi.mock("./use-event-mode-clock", () => ({
  useEventModeClock: () => Date.parse("2026-07-13T12:00:00.000Z"),
}));

vi.mock("@/components/animated-window", () => ({
  AnimatedWindow: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children: ReactNode;
  }) => (isOpen ? <div data-testid="animated-window">{children}</div> : null),
}));

vi.mock("@/components/draggable-window", () => ({
  DraggableWindow: ({
    actions,
    children,
    closable,
    title,
  }: {
    actions?: ReactNode;
    children: ReactNode;
    closable?: boolean;
    title: string;
  }) => (
    <div data-testid="event-mode-window" data-closable={String(closable)}>
      <span>{title}</span>
      {actions}
      {children}
    </div>
  ),
}));

describe("EventMode", () => {
  beforeEach(() => {
    mocks.query.data = undefined;
    mocks.query.dataUpdatedAt = 0;
    mocks.query.enabled = true;
    mocks.query.isError = false;
    mocks.query.margonemAccountId = "account-1";
    mocks.query.normalizedWorld = "tempest";
    useEventModeSelectionStore.setState({ selectedEventIdByScope: {} });
    vi.spyOn(Game, "map", "get").mockReturnValue({ id: 200 } as never);
  });

  it("renders nothing during initial loading or an initial error", () => {
    const { rerender } = render(<EventMode />);

    expect(screen.queryByTestId("event-mode-window")).not.toBeInTheDocument();

    mocks.query.isError = true;
    rerender(<EventMode />);

    expect(screen.queryByTestId("event-mode-window")).not.toBeInTheDocument();
  });

  it("renders nothing after an empty successful response", () => {
    mocks.query.data = createResponse([]);

    render(<EventMode />);

    expect(screen.queryByTestId("event-mode-window")).not.toBeInTheDocument();
  });

  it("renders the current-map assignment, additional count, and respawn", () => {
    mocks.query.data = createResponse([
      createEvent({
        assignments: [createAssignment(100), createAssignment(200)],
      }),
    ]);

    render(<EventMode />);

    expect(screen.getByText("Tryb wydarzenia")).toBeInTheDocument();
    expect(screen.getByText("Polowanie")).toBeInTheDocument();
    expect(screen.getByText("Gildia")).toBeInTheDocument();
    expect(screen.getByText("Mapa 200")).toBeInTheDocument();
    expect(screen.getByText("Na miejscu")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.getByText("Otwarte · 00:30:00")).toBeInTheDocument();
    expect(screen.getByTestId("event-mode-window")).toHaveAttribute(
      "data-closable",
      "false",
    );
  });

  it("keeps successful data visible with a stale indicator after an error", () => {
    mocks.query.data = createResponse([createEvent()]);
    mocks.query.dataUpdatedAt = Date.parse("2026-07-13T11:59:00.000Z");
    mocks.query.isError = true;

    render(<EventMode />);

    expect(screen.getByText("Polowanie")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Dane mogą być nieaktualne/),
    ).toBeInTheDocument();
  });
});

function createResponse(events = [createEvent()]) {
  return {
    generatedAt: "2026-07-13T12:00:00.000Z",
    events,
  };
}

function createEvent({
  id = "event-1",
  assignments = [createAssignment(200)],
}: {
  id?: string;
  assignments?: ReturnType<typeof createAssignment>[];
} = {}) {
  return {
    id,
    name: "Polowanie",
    world: "tempest",
    guild: { id: "guild-1", name: "Gildia" },
    assignments,
    nextRespawn: {
      heroId: "hero-1",
      npcId: 101,
      npcName: "Heros",
      minSpawnTime: "2026-07-13T11:30:00.000Z",
      maxSpawnTime: "2026-07-13T12:30:00.000Z",
      status: "OPEN" as const,
    },
  };
}

function createAssignment(margonemMapId: number) {
  return {
    eventMapId: `map-${margonemMapId}`,
    heroId: "hero-1",
    npcId: 101,
    npcName: "Heros",
    npcIcon: null,
    margonemMapId,
    mapName: `Mapa ${margonemMapId}`,
  };
}
