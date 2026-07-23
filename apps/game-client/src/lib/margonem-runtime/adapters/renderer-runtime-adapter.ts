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

export interface RendererRuntimeAdapter {
  addDrawable(drawable: RuntimeDrawable): void;
  getHighestOrder(): number;
  getMapGeometry(): RuntimeMapGeometry | null;
  getHandheldMiniMap(): RuntimeHandheldMiniMap | null;
  isAvailable(): boolean;
  subscribeDraw(callback: () => void): (() => void) | null;
}

type RendererRuntimeWindow = Window & {
  API?: {
    addCallbackToEvent: (event: string, callback: () => void) => void;
    removeCallbackFromEvent: (event: string, callback: () => void) => void;
  };
  CFG?: { tileSize?: number };
  Engine?: {
    apiData?: { CALL_DRAW_ADD_TO_RENDERER?: string };
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

class MargonemRendererRuntimeAdapter implements RendererRuntimeAdapter {
  private get runtimeWindow(): RendererRuntimeWindow {
    return window as RendererRuntimeWindow;
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
