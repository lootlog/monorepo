import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Game } from "@/lib/game";
import { useEventModeSelectionStore } from "@/store/event-mode-selection.store";
import { useWindowsStore } from "@/store/windows.store";
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

vi.mock("./use-event-mode-clock", () => ({
  useEventModeClock: () => Date.parse("2026-07-13T12:00:00.000Z"),
}));

vi.mock("@/components/draggable-window", () => ({
  DraggableWindow: ({
    actions,
    children,
    closable,
    isOpen,
    onClose,
    title,
  }: {
    actions?: ReactNode;
    children: ReactNode;
    closable?: boolean;
    isOpen: boolean;
    onClose?: () => void;
    title: string;
  }) =>
    isOpen ? (
      <div data-testid="event-mode-window" data-closable={String(closable)}>
        <span>{title}</span>
        {closable ? (
          <button aria-label="close-event-mode" onClick={onClose} type="button">
            close
          </button>
        ) : null}
        {actions}
        {children}
      </div>
    ) : null,
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
    useWindowsStore.setState((state) => ({
      ...state,
      "event-mode": { ...state["event-mode"], open: true },
    }));
    vi.spyOn(Game, "map", "get").mockReturnValue({ id: 200 } as never);
  });

  it("renders nothing during initial loading or an initial error", () => {
    const { rerender } = renderEventMode();

    expect(screen.queryByTestId("event-mode-window")).not.toBeInTheDocument();

    mocks.query.isError = true;
    rerender(<EventMode query={mocks.query as never} />);

    expect(screen.queryByTestId("event-mode-window")).not.toBeInTheDocument();
  });

  it("renders nothing after an empty successful response", () => {
    mocks.query.data = createResponse([]);

    renderEventMode();

    expect(screen.queryByTestId("event-mode-window")).not.toBeInTheDocument();
  });

  it("renders the current-map assignment, additional count, and respawn", () => {
    mocks.query.data = createResponse([
      createEvent({
        assignments: [createAssignment(100), createAssignment(200)],
      }),
    ]);

    renderEventMode();

    expect(screen.getByText("Tryb wydarzenia")).toBeInTheDocument();
    expect(screen.getByText("Polowanie")).toBeInTheDocument();
    expect(screen.getByText("Gildia")).toBeInTheDocument();
    expect(screen.getByText("Mapa 200")).toBeInTheDocument();
    expect(screen.getByText("Na miejscu")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.getByText("Otwarte · 00:30:00")).toBeInTheDocument();
    expect(screen.getByTestId("event-mode-window")).toHaveAttribute(
      "data-closable",
      "true",
    );
  });

  it("respects the persisted window state and can be closed", () => {
    mocks.query.data = createResponse([createEvent()]);
    useWindowsStore.getState().setOpen("event-mode", false);

    const { rerender } = renderEventMode();

    expect(screen.queryByTestId("event-mode-window")).not.toBeInTheDocument();

    act(() => useWindowsStore.getState().setOpen("event-mode", true));
    rerender(<EventMode query={mocks.query as never} />);
    fireEvent.click(screen.getByRole("button", { name: "close-event-mode" }));

    expect(useWindowsStore.getState()["event-mode"].open).toBe(false);
    expect(screen.queryByTestId("event-mode-window")).not.toBeInTheDocument();
  });

  it("keeps successful data visible with a stale indicator after an error", () => {
    mocks.query.data = createResponse([createEvent()]);
    mocks.query.dataUpdatedAt = Date.parse("2026-07-13T11:59:00.000Z");
    mocks.query.isError = true;

    renderEventMode();

    expect(screen.getByText("Polowanie")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Dane mogą być nieaktualne/),
    ).toBeInTheDocument();
  });
});

function renderEventMode() {
  return render(<EventMode query={mocks.query as never} />);
}

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
