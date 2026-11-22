const CLAN_ENEMY_KIND = "cl-en";

export const MINIMAP_ICON = { square: 0, circle: 1, rhomb: 2 } as const;

type MinimapIcon = (typeof MINIMAP_ICON)[keyof typeof MINIMAP_ICON];

export type MinimapPlayerStyle = { color: string; icon: MinimapIcon };

export type MinimapSquares = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  margin: { left: number; top: number };
  normalSize: number;
  minSize: number;
  squareMargin: number;
};

type TipContent = [content: string, type: string];

type JQueryTipTarget = {
  tip?: (content: string | null, type?: string) => void;
  on?: (events: string, handler: (event: MinimapHoverEvent) => void) => void;
  off?: (events: string) => void;
};

export type MinimapHoverEvent = { clientX: number; clientY: number };

type MinimapRuntimeWindow = Window & {
  $?: (element: Element) => JQueryTipTarget;
  Engine?: {
    miniMapController?: {
      handHeldMiniMapController?: {
        canUpdate?: (type: string, kind: string) => boolean | undefined;
        getColorByKind?: (kind: string) => string | undefined;
        // oxlint-disable-next-line anti-slop/no-icon-in-symbol-names -- The game names its own method.
        // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- The game names its own method.
        getShapeByKind?: (kind: string) => number | undefined;
        getHandHeldMiniMapWindow?: () => {
          getCanvas?: () => HTMLCanvasElement;
          getCtx?: () => CanvasRenderingContext2D;
          getMargin?: () => { left: number; top: number };
          getSquareData?: () => {
            normalSize?: number;
            minSize?: number;
            margin?: number;
          };
          isShow?: () => boolean;
        };
        getMiniMapTipController?: () => {
          getObjectFromCordsArray?: (
            tiles: ReadonlyArray<{ x: number; y: number }>,
          ) => object | null;
          show?: (
            event: MinimapHoverEvent,
            object: { getTip: () => TipContent; getRef: () => null },
          ) => void;
        };
      };
    };
    others?: {
      createStrTip?: (data: {
        nick: string;
        level?: number;
        prof?: string;
        clanName?: string | null;
      }) => string;
    };
  };
};

const getRuntimeWindow = (): MinimapRuntimeWindow => window;

const getController = () =>
  getRuntimeWindow().Engine?.miniMapController?.handHeldMiniMapController;

const HOVER_EVENTS = "mousemove.lootlogAirTags";

const PLAYER_TIP_TYPE = "t_other";

const BARE_HEX_COLOR = /^[0-9a-f]{6}$/i;

const isMinimapIcon = (icon: unknown): icon is MinimapIcon =>
  icon === MINIMAP_ICON.square ||
  icon === MINIMAP_ICON.circle ||
  icon === MINIMAP_ICON.rhomb;

export function getMinimapSquares(): MinimapSquares | null {
  const miniMapWindow = getController()?.getHandHeldMiniMapWindow?.();

  if (!miniMapWindow || miniMapWindow.isShow?.() === false) return null;

  const canvas = miniMapWindow.getCanvas?.();
  const context = miniMapWindow.getCtx?.();
  const margin = miniMapWindow.getMargin?.();
  const squares = miniMapWindow.getSquareData?.();
  const normalSize = squares?.normalSize;

  if (!canvas || !context || !margin || !normalSize || normalSize <= 0)
    return null;

  return {
    canvas,
    context,
    margin,
    normalSize,
    minSize: squares.minSize ?? normalSize,
    squareMargin: squares.margin ?? 0,
  };
}

export function getMinimapClanEnemyStyle(): MinimapPlayerStyle | null {
  const controller = getController();

  if (!controller?.canUpdate?.("other", CLAN_ENEMY_KIND)) return null;

  const color = controller.getColorByKind?.(CLAN_ENEMY_KIND);
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- The game names its own method.
  const icon = controller.getShapeByKind?.(CLAN_ENEMY_KIND);

  if (!color) return null;

  return {
    color: BARE_HEX_COLOR.test(color) ? `#${color}` : color,
    icon: isMinimapIcon(icon) ? icon : MINIMAP_ICON.square,
  };
}

export function hasMinimapObjectAt(x: number, y: number): boolean {
  return Boolean(
    getController()
      ?.getMiniMapTipController?.()
      ?.getObjectFromCordsArray?.([{ x, y }]),
  );
}

export function buildPlayerTipHtml(player: {
  nick: string;
  level?: number;
  prof?: string;
  clanName?: string;
}): string | null {
  try {
    return (
      getRuntimeWindow().Engine?.others?.createStrTip?.({
        nick: player.nick,
        level: player.level,
        prof: player.prof,
        clanName: player.clanName ?? null,
      }) ?? null
    );
  } catch {
    return null;
  }
}

export function showMinimapTip(event: MinimapHoverEvent, html: string): void {
  getController()
    ?.getMiniMapTipController?.()
    ?.show?.(event, {
      getTip: () => [html, PLAYER_TIP_TYPE],
      getRef: () => null,
    });
}

export function subscribeMinimapHover(
  canvas: HTMLCanvasElement,
  handler: (event: MinimapHoverEvent) => void,
): (() => void) | null {
  const target = getRuntimeWindow().$?.(canvas);

  if (!target?.on || !target.off) return null;

  target.on(HOVER_EVENTS, (event) => {
    try {
      handler(event);
    } catch (error) {
      console.warn("[Lootlog] Minimap hover failed:", error);
    }
  });

  return () => {
    try {
      getRuntimeWindow().$?.(canvas).off?.(HOVER_EVENTS);
    } catch {}
  };
}

export function setPlayerTip(element: Element, html: string | null): void {
  try {
    getRuntimeWindow().$?.(element).tip?.(html, PLAYER_TIP_TYPE);
  } catch {}
}
