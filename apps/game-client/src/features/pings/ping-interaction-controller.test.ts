import {
  PING_HOLD_DELAY_MS,
  PING_WHEEL_CANCEL_RADIUS_PX,
  PingInteractionController,
  type PingMenu,
  type PingPressIdentity,
} from "./ping-interaction-controller";

const mouseIdentity = (button = 1): PingPressIdentity => ({
  kind: "mouse",
  button,
});

const MAP_MENU: PingMenu = {
  centre: "attention",
  quick: "attention",
  ring: ["enemy", "avoid", "regroup"],
  title: null,
};

const ALLY_MENU: PingMenu = {
  centre: null,
  quick: null,
  ring: ["atmo", "rime", "heal"],
  title: "Leczek",
};

const mapTarget = { kind: "map", mapId: 42, tile: { x: 12, y: 8 } } as const;

const viewport = () => ({ height: 600, width: 800 });

const start = (
  controller: PingInteractionController,
  menu = MAP_MENU,
  origin = { x: 300, y: 300 },
  identity = mouseIdentity(),
) => controller.begin({ identity, menu, origin, target: mapTarget });

describe("PingInteractionController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends the quick ping for a tap and nothing when the menu has none", () => {
    const controller = new PingInteractionController({ getViewport: viewport });

    start(controller);
    expect(controller.complete(mouseIdentity())).toEqual({
      target: mapTarget,
      type: "attention",
    });

    start(controller, ALLY_MENU);
    expect(controller.complete(mouseIdentity())).toBeNull();
    expect(controller.isActive()).toBe(false);
  });

  it("opens on a flick before the hold delay and selects the flicked option", () => {
    const controller = new PingInteractionController({ getViewport: viewport });
    start(controller);

    controller.updatePointer({ x: 300, y: 250 });

    expect(controller.getSnapshot()?.selectedType).toBe("enemy");
    expect(controller.complete(mouseIdentity())?.type).toBe("enemy");
  });

  it("sends the centre option when released in the dead zone and cancels far away", () => {
    const controller = new PingInteractionController({ getViewport: viewport });
    start(controller);
    vi.advanceTimersByTime(PING_HOLD_DELAY_MS);

    controller.updatePointer({ x: 305, y: 303 });
    expect(controller.getSnapshot()?.selectedType).toBe("attention");

    controller.updatePointer({
      x: 300,
      y: 300 + PING_WHEEL_CANCEL_RADIUS_PX + 1,
    });
    expect(controller.complete(mouseIdentity())).toBeNull();
  });

  it("leaves the battle wheel centre empty so a release there cancels", () => {
    const controller = new PingInteractionController({ getViewport: viewport });
    start(controller, ALLY_MENU);
    vi.advanceTimersByTime(PING_HOLD_DELAY_MS);

    expect(controller.getSnapshot()?.selectedType).toBeNull();
    expect(controller.complete(mouseIdentity())).toBeNull();
  });

  it.each([
    ["atmo", { x: 300, y: 250 }],
    ["rime", { x: 345, y: 325 }],
    ["heal", { x: 255, y: 325 }],
  ] as const)(
    "selects the %s ring option clockwise from the top",
    (type, pointer) => {
      const controller = new PingInteractionController({
        getViewport: viewport,
      });

      start(controller, ALLY_MENU);
      vi.advanceTimersByTime(PING_HOLD_DELAY_MS);

      controller.updatePointer(pointer);

      expect(controller.complete(mouseIdentity())?.type).toBe(type);
    },
  );

  it("measures direction from the clamped centre the player sees near an edge", () => {
    const controller = new PingInteractionController({ getViewport: viewport });
    start(controller, MAP_MENU, { x: 300, y: 10 });
    vi.advanceTimersByTime(PING_HOLD_DELAY_MS);

    const center = controller.getSnapshot()?.visualCenter;
    expect(center?.y).toBeGreaterThan(10);

    // The top tile sits above the clamped centre, i.e. below the press point.
    controller.updatePointer({ x: 300, y: (center?.y ?? 0) - 50 });

    expect(controller.complete(mouseIdentity())?.type).toBe("enemy");
  });

  it("ignores another button and rejects a second interaction", () => {
    const controller = new PingInteractionController({ getViewport: viewport });
    start(controller);

    expect(controller.complete(mouseIdentity(3))).toBeNull();
    expect(controller.isActive()).toBe(true);
    expect(start(controller, MAP_MENU, undefined, mouseIdentity(3))).toBe(
      false,
    );

    controller.cancel();
    expect(controller.getSnapshot()).toBeNull();
  });
});
