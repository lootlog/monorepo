import {
  MAP_PING_HOLD_DELAY_MS,
  MAP_PING_WHEEL_DEAD_ZONE_PX,
  MapPingInteractionController,
  clampMapPingWheelCenter,
  resolveMapPingTypeFromPointer,
  type MapPingPressIdentity,
} from "./map-ping-interaction-controller";

const mouseIdentity = (button = 1): MapPingPressIdentity => ({
  kind: "mouse",
  button,
});

const startInteraction = (
  controller: MapPingInteractionController,
  identity = mouseIdentity(),
) =>
  controller.begin({
    identity,
    mapId: 42,
    origin: { x: 100, y: 100 },
    tile: { x: 12, y: 8 },
  });

describe("MapPingInteractionController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an attention submission for a tap", () => {
    const controller = new MapPingInteractionController();

    expect(startInteraction(controller)).toBe(true);
    expect(controller.complete(mouseIdentity())).toEqual({
      mapId: 42,
      tile: { x: 12, y: 8 },
      type: "attention",
    });
    expect(controller.isActive()).toBe(false);
    expect(controller.getSnapshot()).toBeNull();
  });

  it("opens the wheel after the hold delay with a stable snapshot", () => {
    const controller = new MapPingInteractionController({
      getViewport: () => ({ height: 600, width: 800 }),
    });
    const listener = vi.fn();
    controller.subscribe(listener);

    startInteraction(controller);
    expect(controller.getSnapshot()).toBeNull();

    vi.advanceTimersByTime(MAP_PING_HOLD_DELAY_MS);

    const snapshot = controller.getSnapshot();
    expect(snapshot).toEqual({
      selectedType: null,
      visualCenter: { x: 100, y: 100 },
    });
    expect(controller.getSnapshot()).toBe(snapshot);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["attention", { x: 100, y: 60 }],
    ["enemy", { x: 140, y: 100 }],
    ["avoid", { x: 100, y: 140 }],
    ["regroup", { x: 60, y: 100 }],
  ] as const)("submits the %s wheel segment", (type, pointer) => {
    const controller = new MapPingInteractionController();
    startInteraction(controller);
    vi.advanceTimersByTime(MAP_PING_HOLD_DELAY_MS);

    controller.updatePointer(pointer);

    expect(controller.getSnapshot()?.selectedType).toBe(type);
    expect(controller.complete(mouseIdentity())).toEqual({
      mapId: 42,
      tile: { x: 12, y: 8 },
      type,
    });
  });

  it("leaves state unchanged for an identity mismatch and cancels a dead-zone completion", () => {
    const controller = new MapPingInteractionController();
    startInteraction(controller);

    expect(controller.complete(mouseIdentity(3))).toBeNull();
    expect(controller.isActive()).toBe(true);

    vi.advanceTimersByTime(MAP_PING_HOLD_DELAY_MS);
    expect(controller.complete(mouseIdentity())).toBeNull();
    expect(controller.isActive()).toBe(false);
  });

  it("rejects a duplicate interaction until the current one is cancelled", () => {
    const controller = new MapPingInteractionController();

    expect(startInteraction(controller)).toBe(true);
    expect(startInteraction(controller, mouseIdentity(3))).toBe(false);
    controller.cancel();
    expect(startInteraction(controller, mouseIdentity(3))).toBe(true);
  });
});

describe("map ping wheel geometry", () => {
  it.each([
    ["attention", -135],
    ["attention", -90],
    ["enemy", -45],
    ["enemy", 0],
    ["avoid", 45],
    ["avoid", 90],
    ["regroup", 135],
    ["regroup", 180],
  ] as const)("maps the %s segment boundary at %s degrees", (type, angle) => {
    const radians = (angle * Math.PI) / 180;
    const origin = { x: 100, y: 100 };
    const pointer = {
      x: origin.x + Math.cos(radians) * 40,
      y: origin.y + Math.sin(radians) * 40,
    };

    expect(resolveMapPingTypeFromPointer(origin, pointer)).toBe(type);
  });

  it("keeps the dead-zone boundary unselected", () => {
    expect(
      resolveMapPingTypeFromPointer(
        { x: 100, y: 100 },
        { x: 100 + MAP_PING_WHEEL_DEAD_ZONE_PX, y: 100 },
      ),
    ).toBeNull();
  });

  it("clamps the visual centre independently on normal and tiny viewports", () => {
    expect(
      clampMapPingWheelCenter({ x: 10, y: 590 }, { width: 800, height: 600 }),
    ).toEqual({ x: 100, y: 500 });
    expect(
      clampMapPingWheelCenter({ x: 10, y: 20 }, { width: 160, height: 180 }),
    ).toEqual({ x: 80, y: 90 });
  });
});
