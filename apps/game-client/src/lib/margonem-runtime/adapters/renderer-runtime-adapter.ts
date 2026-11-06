export type RuntimeDrawable = {
  draw: (context: CanvasRenderingContext2D) => void;
  getOrder: () => number;
  getAlwaysDraw: () => boolean;
};

export type RuntimeMapGeometry = {
  id?: number;
  offset?: readonly [number, number];
  size?: { x: number; y: number };
  tileSize: number;
};

export type RuntimeHandheldMiniMap = {
  canvas?: HTMLCanvasElement;
  context?: CanvasRenderingContext2D;
  margin?: { left: number; top: number };
  normalSize?: number;
};

/** A character's hit box in map pixels, as the game uses it for mouse input. */
export type RuntimeCharacterBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

/** A monster a player can attack, or another player. */
export type RuntimeCharacterRef = { kind: "npc" | "player"; id: number };

export type RuntimeCharacterHit = RuntimeCharacterRef & {
  bounds: RuntimeCharacterBounds;
  tile: { x: number; y: number };
};

export interface RendererRuntimeAdapter {
  addDrawable(drawable: RuntimeDrawable): void;
  getHighestOrder(): number;
  getMapGeometry(): RuntimeMapGeometry | null;
  getHandheldMiniMap(): RuntimeHandheldMiniMap | null;
  /**
   * The topmost attackable NPC or other player whose hit box contains a
   * map-pixel point.
   */
  findPingableCharacterAt(x: number, y: number): RuntimeCharacterHit | null;
  getCharacterBounds(
    character: RuntimeCharacterRef,
  ): RuntimeCharacterBounds | null;
  isAvailable(): boolean;
  subscribeDraw(callback: () => void): (() => void) | null;
}

type RuntimeCharacterHandle = {
  collider?: { box?: readonly [number, number, number, number] } | null;
  // Players are keyed by their id as a string; NPCs carry a number.
  d?: { id?: number | string; type?: number; x?: number; y?: number };
  ry?: number;
};

type RuntimeCharacterCollection = {
  check?: () => Record<string, RuntimeCharacterHandle>;
  getById?: (id: number) => RuntimeCharacterHandle | undefined;
};

type RendererRuntimeWindow = Window & {
  API?: {
    addCallbackToEvent: (event: string, callback: () => void) => void;
    removeCallbackFromEvent: (event: string, callback: () => void) => void;
  };
  CFG?: { tileSize?: number };
  Engine?: {
    apiData?: { CALL_DRAW_ADD_TO_RENDERER?: string };
    npcs?: RuntimeCharacterCollection;
    others?: RuntimeCharacterCollection;
    map?: {
      d?: { id?: number };
      offset?: [number, number];
      size?: { x: number; y: number };
      getOffset?: () => [number, number];
    };
    miniMapController?: {
      handHeldMiniMapController?: {
        getHandHeldMiniMapWindow?: () => {
          getCanvas?: () => HTMLCanvasElement;
          getCtx?: () => CanvasRenderingContext2D;
          getMargin?: () => { left: number; top: number };
          getSquareData?: () => { normalSize: number };
        };
      };
    };
    renderer?: {
      add: (drawable: RuntimeDrawable) => void;
      getHighestOrderWithoutSort?: () => number;
    };
  };
};

const DEFAULT_TILE_SIZE = 32;

/** Consecutive failing frames (about two seconds) before a draw gives up for the session. */
const MAX_CONSECUTIVE_DRAW_FAILURES = 120;

/**
 * Runs Lootlog work inside the game's frame loop without letting it throw
 * into Margonem. A passing error skips one frame; a long unbroken run
 * disables the step so a broken feature cannot cost every frame.
 */
const makeDrawGuard = (onDisabled?: () => void) => {
  let failures = 0;
  let disabled = false;
  let reported = false;

  // The step and its argument are passed apart so a frame allocates nothing.
  return <A>(step: (argument: A) => void, argument: A) => {
    if (disabled) return;

    try {
      step(argument);
      failures = 0;
    } catch (error) {
      failures += 1;

      // The first error is reported so a step that fails and recovers stays
      // visible; the rest are silent until the step gives up.
      if (failures === 1 && !reported) {
        reported = true;
        console.warn("[Lootlog] Drawing step failed:", error);
      }

      if (failures < MAX_CONSECUTIVE_DRAW_FAILURES) return;
      disabled = true;
      console.warn("[Lootlog] Drawing disabled after errors:", error);
      onDisabled?.();
    }
  };
};

// One stable wrapper per drawable, since drawables are re-added every frame.
const guardedDrawables = new WeakMap<RuntimeDrawable, RuntimeDrawable>();

const guardDrawable = (drawable: RuntimeDrawable): RuntimeDrawable => {
  const existing = guardedDrawables.get(drawable);

  if (existing) return existing;
  const guard = makeDrawGuard();

  // Keeps `this` for drawables whose draw is a method.
  const drawInto = (context: CanvasRenderingContext2D) =>
    drawable.draw(context);

  const guarded: RuntimeDrawable = {
    draw: (context) => guard(drawInto, context),
    // The game sorts and filters by these every frame, so they fall back
    // instead of throwing into its renderer.
    getOrder: () => {
      try {
        return drawable.getOrder();
      } catch {
        return 0;
      }
    },
    getAlwaysDraw: () => {
      try {
        return drawable.getAlwaysDraw();
      } catch {
        return false;
      }
    },
  };

  guardedDrawables.set(drawable, guarded);

  return guarded;
};

// Margonem NPC types 2 and 3 are the monsters a player can attack; the others
// are dialogue characters, objects and decorations.
const ATTACKABLE_NPC_TYPES = new Set([2, 3]);

const toBounds = (
  handle: RuntimeCharacterHandle,
): RuntimeCharacterBounds | null => {
  const box = handle.collider?.box;

  if (!box) return null;
  const [left, top, right, bottom] = box;

  return { bottom, left, right, top };
};

// Strict comparisons, like the game's own hit test.
const containsPoint = (bounds: RuntimeCharacterBounds, x: number, y: number) =>
  x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom;

const toPingableHit = (
  kind: RuntimeCharacterRef["kind"],
  handle: RuntimeCharacterHandle,
) => {
  const { type, x, y } = handle.d ?? {};
  const id = Number(handle.d?.id);
  const bounds = toBounds(handle);

  if (
    !bounds ||
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    x === undefined ||
    y === undefined ||
    (kind === "npc" && (type === undefined || !ATTACKABLE_NPC_TYPES.has(type)))
  ) {
    return null;
  }

  return { bounds, id, kind, order: handle.ry ?? y, tile: { x, y } };
};

class MargonemRendererRuntimeAdapter implements RendererRuntimeAdapter {
  private get runtimeWindow(): RendererRuntimeWindow {
    return window;
  }

  addDrawable(drawable: RuntimeDrawable): void {
    this.runtimeWindow.Engine?.renderer?.add(guardDrawable(drawable));
  }

  getHighestOrder(): number {
    return (
      this.runtimeWindow.Engine?.renderer?.getHighestOrderWithoutSort?.() ?? 10
    );
  }

  getMapGeometry(): RuntimeMapGeometry | null {
    const map = this.runtimeWindow.Engine?.map;

    if (!map) return null;

    return {
      id: map.d?.id,
      offset: map.getOffset?.() ?? map.offset,
      size: map.size,
      tileSize: this.runtimeWindow.CFG?.tileSize ?? DEFAULT_TILE_SIZE,
    };
  }

  getHandheldMiniMap(): RuntimeHandheldMiniMap | null {
    const miniMapWindow =
      this.runtimeWindow.Engine?.miniMapController?.handHeldMiniMapController?.getHandHeldMiniMapWindow?.();

    if (!miniMapWindow) return null;

    return {
      canvas: miniMapWindow.getCanvas?.(),
      context: miniMapWindow.getCtx?.(),
      margin: miniMapWindow.getMargin?.(),
      normalSize: miniMapWindow.getSquareData?.().normalSize,
    };
  }

  findPingableCharacterAt(x: number, y: number): RuntimeCharacterHit | null {
    const engine = this.runtimeWindow.Engine;
    let hit: ReturnType<typeof toPingableHit> = null;

    const collections = [
      ["npc", engine?.npcs?.check?.()],
      ["player", engine?.others?.check?.()],
    ] as const;

    // The game gives the character drawn in front (lower on screen) priority.
    for (const [kind, handles] of collections) {
      for (const handle of Object.values(handles ?? {})) {
        const candidate = toPingableHit(kind, handle);

        if (
          candidate &&
          containsPoint(candidate.bounds, x, y) &&
          (!hit || candidate.order > hit.order)
        ) {
          hit = candidate;
        }
      }
    }

    return hit
      ? { bounds: hit.bounds, id: hit.id, kind: hit.kind, tile: hit.tile }
      : null;
  }

  getCharacterBounds({
    id,
    kind,
  }: RuntimeCharacterRef): RuntimeCharacterBounds | null {
    const engine = this.runtimeWindow.Engine;
    const collection = kind === "npc" ? engine?.npcs : engine?.others;
    const handle = collection?.getById?.(id);

    return handle ? toBounds(handle) : null;
  }

  isAvailable(): boolean {
    return Boolean(
      this.runtimeWindow.Engine?.apiData?.CALL_DRAW_ADD_TO_RENDERER &&
      this.runtimeWindow.API,
    );
  }

  subscribeDraw(callback: () => void): (() => void) | null {
    const event = this.runtimeWindow.Engine?.apiData?.CALL_DRAW_ADD_TO_RENDERER;
    const api = this.runtimeWindow.API;

    if (!event || !api) return null;

    const unsubscribe = () => {
      const currentApi = this.runtimeWindow.API;

      if (!currentApi) return;
      currentApi.removeCallbackFromEvent(event, guarded);
    };

    const guard = makeDrawGuard(unsubscribe);
    const guarded = () => guard(callback, undefined);

    api.addCallbackToEvent(event, guarded);

    return unsubscribe;
  }
}

export const rendererRuntimeAdapter: RendererRuntimeAdapter =
  new MargonemRendererRuntimeAdapter();

export const getMapCanvasCoordinate = (
  coordinate: number,
  tileSize: number,
  offset: number,
): number => coordinate * tileSize + tileSize / 2 - offset;

export const getMiniMapCanvasCoordinate = (
  coordinate: number,
  normalSize: number,
  margin: number,
): number => margin + (coordinate + 0.5) * normalSize;
