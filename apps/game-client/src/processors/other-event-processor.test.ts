import type { GameEvent } from "@lootlog/margonem/game-events";
import { OtherEventProcessor } from "./other-event-processor";

const handleObservations = vi.hoisted(() => vi.fn());

vi.mock("@/features/air-tags/air-tag-observation-controller", () => ({
  airTagObservationController: { handle: handleObservations },
}));

describe("OtherEventProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards raw other events to the observation controller", () => {
    const other = { "42": { id: 42, x: 10, y: 20 } };

    new OtherEventProcessor().handle({ other } as unknown as GameEvent);

    expect(handleObservations).toHaveBeenCalledWith(other);
  });

  it("ignores events without other data", () => {
    new OtherEventProcessor().handle({});

    expect(handleObservations).not.toHaveBeenCalled();
  });
});
