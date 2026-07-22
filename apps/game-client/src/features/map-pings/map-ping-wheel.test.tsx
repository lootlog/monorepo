import { act, render, screen } from "@testing-library/react";
import { MapPingWheel } from "./map-ping-wheel";
import {
  MAP_PING_HOLD_DELAY_MS,
  mapPingInteractionController,
} from "./map-ping-interaction-controller";

describe("MapPingWheel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mapPingInteractionController.cancel();
  });

  afterEach(() => {
    mapPingInteractionController.cancel();
    vi.useRealTimers();
  });

  it("renders the clamped wheel and highlights the selected translated type", () => {
    mapPingInteractionController.begin({
      identity: { kind: "mouse", button: 1 },
      mapId: 42,
      origin: { x: 200, y: 200 },
      tile: { x: 12, y: 8 },
    });
    vi.advanceTimersByTime(MAP_PING_HOLD_DELAY_MS);

    render(<MapPingWheel />);

    const wheel = screen.getByRole("status");
    expect(wheel).toHaveStyle({
      left: "112px",
      pointerEvents: "none",
      top: "112px",
    });
    expect(screen.getByText("Anuluj")).toBeInTheDocument();

    act(() => {
      mapPingInteractionController.updatePointer({ x: 240, y: 200 });
    });

    expect(screen.getByText("Wróg")).toBeInTheDocument();
    expect(screen.getByTestId("map-ping-segment-enemy")).toHaveAttribute(
      "data-selected",
      "true",
    );

    act(() => {
      mapPingInteractionController.cancel();
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
