import type { AirTagTarget } from "@lootlog/schema/air-tag";
import { airTagReceiveController } from "./air-tag-receive-controller";
import {
  AIR_TAG_FADE_START_MS,
  AIR_TAG_TARGET_TTL_MS,
  AirTagRenderer,
  getAirTagMarkerAlpha,
} from "./air-tag-renderer";

const createContext = () =>
  ({
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    strokeText: vi.fn(),
    fillText: vi.fn(),
  }) as unknown as CanvasRenderingContext2D;

const createTarget = (overrides: Partial<AirTagTarget> = {}): AirTagTarget => ({
  targetId: "neutral",
  nickname: "Neutral",
  relation: 1,
  x: 4,
  y: 5,
  observedAt: 1_000,
  ...overrides,
});

describe("AirTagRenderer", () => {
  afterEach(() => {
    airTagReceiveController.clear();
    vi.useRealTimers();
  });

  it("keeps full alpha before fade and reaches zero at TTL", () => {
    expect(getAirTagMarkerAlpha(AIR_TAG_FADE_START_MS)).toBe(1);
    expect(
      getAirTagMarkerAlpha(
        AIR_TAG_FADE_START_MS +
          (AIR_TAG_TARGET_TTL_MS - AIR_TAG_FADE_START_MS) / 2,
      ),
    ).toBeCloseTo(0.5);
    expect(getAirTagMarkerAlpha(AIR_TAG_TARGET_TTL_MS)).toBe(0);
  });

  it("keeps the draw listener detached until a renderable target exists", () => {
    const addCallbackToEvent = vi.fn();
    const removeCallbackFromEvent = vi.fn();
    testRuntimeWindow.Engine = {
      apiData: { CALL_DRAW_ADD_TO_RENDERER: "draw" },
    } as never;
    testRuntimeWindow.API = {
      addCallbackToEvent,
      removeCallbackFromEvent,
    } as never;
    const renderer = new AirTagRenderer(() => 2_000);

    expect(renderer.register()).toBe(true);
    expect(addCallbackToEvent).not.toHaveBeenCalled();

    airTagReceiveController.beginSubscription("request", "aether", 42);
    airTagReceiveController.applySubscriptionAck({
      status: "accepted",
      requestId: "request",
      scopes: [
        {
          guildId: "guild-1",
          world: "aether",
          mapId: 42,
          epochId: "epoch",
          epochStartedAt: 100,
          revision: 1,
          targets: [createTarget()],
        },
      ],
    });

    expect(addCallbackToEvent).toHaveBeenCalledTimes(1);
    renderer.unregister();
    expect(removeCallbackFromEvent).toHaveBeenCalledTimes(1);
  });

  it("expires targets and detaches drawing even when no draw frame arrives", () => {
    vi.useFakeTimers();
    let now = 2_000;
    const removeCallbackFromEvent = vi.fn();
    testRuntimeWindow.Engine = {
      apiData: { CALL_DRAW_ADD_TO_RENDERER: "draw" },
    } as never;
    testRuntimeWindow.API = {
      addCallbackToEvent: vi.fn(),
      removeCallbackFromEvent,
    } as never;
    airTagReceiveController.beginSubscription("request", "aether", 42);
    airTagReceiveController.applySubscriptionAck({
      status: "accepted",
      requestId: "request",
      scopes: [
        {
          guildId: "guild-1",
          world: "aether",
          mapId: 42,
          epochId: "epoch",
          epochStartedAt: 100,
          revision: 1,
          targets: [createTarget()],
        },
      ],
    });
    const renderer = new AirTagRenderer(() => now);

    renderer.register();
    now += AIR_TAG_TARGET_TTL_MS;
    vi.advanceTimersByTime(AIR_TAG_TARGET_TTL_MS);

    const removalCountBeforeCleanup = removeCallbackFromEvent.mock.calls.length;
    renderer.unregister();
    expect(removalCountBeforeCleanup).toBe(1);
  });

  it("draws every target on the minimap and only CLAN_ENEMY on main canvas", () => {
    const miniMapContext = createContext();
    const mainMapContext = createContext();
    const addDrawable = vi.fn();
    let drawFrame: (() => void) | undefined;
    const addCallbackToEvent = vi.fn((_event: string, callback: () => void) => {
      drawFrame = callback;
    });
    const removeCallbackFromEvent = vi.fn();
    testRuntimeWindow.Engine = {
      apiData: { CALL_DRAW_ADD_TO_RENDERER: "draw" },
      renderer: {
        add: addDrawable,
        getHighestOrderWithoutSort: () => 10,
      },
      map: {
        d: { id: 42 },
        size: { x: 100, y: 100 },
        offset: [0, 0],
      },
      miniMapController: {
        handHeldMiniMapController: {
          getHandHeldMiniMapWindow: () => ({
            getCtx: () => miniMapContext,
            getMargin: () => ({ left: 0, top: 0 }),
            getSquareData: () => ({ normalSize: 3 }),
          }),
        },
      },
    } as never;
    testRuntimeWindow.API = {
      addCallbackToEvent,
      removeCallbackFromEvent,
    };

    airTagReceiveController.beginSubscription("request", "aether", 42);
    airTagReceiveController.applySubscriptionAck({
      status: "accepted",
      requestId: "request",
      scopes: [
        {
          guildId: "guild-1",
          world: "aether",
          mapId: 42,
          epochId: "epoch",
          epochStartedAt: 100,
          revision: 1,
          targets: [
            createTarget(),
            createTarget({
              targetId: "enemy",
              nickname: "Enemy",
              relation: 6,
              clanEnemyObservedAt: 1_000,
              x: 8,
              y: 9,
            }),
          ],
        },
      ],
    });
    const renderer = new AirTagRenderer(() => 2_000);

    expect(renderer.register()).toBe(true);
    expect(renderer.register()).toBe(false);
    drawFrame?.();

    expect(miniMapContext.arc).toHaveBeenCalledTimes(2);
    expect(addDrawable).toHaveBeenCalledOnce();
    const drawable = addDrawable.mock.calls[0]?.[0] as {
      draw: (context: CanvasRenderingContext2D) => void;
    };
    drawable.draw(mainMapContext);
    expect(mainMapContext.arc).toHaveBeenCalledTimes(1);
    expect(mainMapContext.fillText).toHaveBeenCalledWith(
      expect.stringContaining("Enemy"),
      expect.any(Number),
      expect.any(Number),
    );

    renderer.unregister();
    expect(removeCallbackFromEvent).toHaveBeenCalledOnce();
  });
});
import { testRuntimeWindow } from "@/test/test-runtime-window";
