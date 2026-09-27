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

/** An NPC's hit box in map pixels, as the game uses it for mouse input. */
export type RuntimeNpcBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export type RuntimeNpcHit = {
  bounds: RuntimeNpcBounds;
  id: number;
  tile: { x: number; y: number };
};

export interface RendererRuntimeAdapter {
  addDrawable(drawable: RuntimeDrawable): void;
  getHighestOrder(): number;
  getMapGeometry(): RuntimeMapGeometry | null;
  getHandheldMiniMap(): RuntimeHandheldMiniMap | null;
  /** The topmost attackable NPC whose hit box contains a map-pixel point. */
  findAttackableNpcAt(x: number, y: number): RuntimeNpcHit | null;
  getNpcBounds(id: number): RuntimeNpcBounds | null;
  isAvailable(): boolean;
  subscribeDraw(callback: () => void): (() => void) | null;
}

type RuntimeNpcHandle = {
  collider?: { box?: readonly [number, number, number, number] } | null;
  d?: { id?: number; type?: number; x?: number; y?: number };
  ry?: number;
};

type RendererRuntimeWindow = Window & {
  API?: {
    addCallbackToEvent: (event: string, callback: () => void) => void;
    removeCallbackFromEvent: (event: string, callback: () => void) => void;
  };
  CFG?: { tileSize?: number };
  Engine?: {
    apiData?: { CALL_DRAW_ADD_TO_RENDERER?: string };
    npcs?: {
      check?: () => Record<string, RuntimeNpcHandle>;
      getById?: (id: number) => RuntimeNpcHandle | undefined;
    };
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

// Margonem NPC types 2 and 3 are the monsters a player can attack; the others
// are dialogue characters, objects and decorations.
const ATTACKABLE_NPC_TYPES = new Set([2, 3]);

const toBounds = (handle: RuntimeNpcHandle): RuntimeNpcBounds | null => {
  const box = handle.collider?.box;

  if (!box) return null;
  const [left, top, right, bottom] = box;

  return { bottom, left, right, top };
};

// Strict comparisons, like the game's own hit test.
const containsPoint = (bounds: RuntimeNpcBounds, x: number, y: number) =>
  x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom;

const toAttackableHit = (handle: RuntimeNpcHandle) => {
  const { id, type, x, y } = handle.d ?? {};
  const bounds = toBounds(handle);

  if (
    !bounds ||
    id === undefined ||
    x === undefined ||
    y === undefined ||
    type === undefined ||
    !ATTACKABLE_NPC_TYPES.has(type)
  ) {
    return null;
  }

  return { bounds, id, order: handle.ry ?? y, tile: { x, y } };
};

class MargonemRendererRuntimeAdapter implements RendererRuntimeAdapter {
  private get runtimeWindow(): RendererRuntimeWindow {
    return window;
  }

  addDrawable(drawable: RuntimeDrawable): void {
    this.runtimeWindow.Engine?.renderer?.add(drawable);
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

  findAttackableNpcAt(x: number, y: number): RuntimeNpcHit | null {
    const npcs = this.runtimeWindow.Engine?.npcs?.check?.();

    if (!npcs) return null;

    let hit: (RuntimeNpcHit & { order: number }) | null = null;

    // The game gives the NPC drawn in front (lower on screen) priority.
    for (const handle of Object.values(npcs)) {
      const candidate = toAttackableHit(handle);

      if (
        candidate &&
        containsPoint(candidate.bounds, x, y) &&
        (!hit || candidate.order > hit.order)
      ) {
        hit = candidate;
      }
    }

    return hit ? { bounds: hit.bounds, id: hit.id, tile: hit.tile } : null;
  }

  getNpcBounds(id: number): RuntimeNpcBounds | null {
    const handle = this.runtimeWindow.Engine?.npcs?.getById?.(id);

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

    api.addCallbackToEvent(event, callback);

    return () => {
      const currentApi = this.runtimeWindow.API;

      if (!currentApi) return;
      currentApi.removeCallbackFromEvent(event, callback);
    };
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
