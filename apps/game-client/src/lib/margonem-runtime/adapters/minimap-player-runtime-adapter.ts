/**
 * The handheld minimap's own view of other players: how it draws each kind,
 * what the player chose to show, and the tip it opens on hover. Lootlog draws
 * players the game does not know about the same way.
 */

/** HandHeldMiniMapData.KIND of a clan enemy. */
const CLAN_ENEMY_KIND = "cl-en";

/** HandHeldMiniMapData.STATIC_ICONS. */
export const MINIMAP_ICON = { square: 0, circle: 1, rhomb: 2 } as const;

type MinimapIcon = (typeof MINIMAP_ICON)[keyof typeof MINIMAP_ICON];

export type MinimapPlayerStyle = { color: string; icon: MinimapIcon };

export type MinimapSquares = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  margin: { left: number; top: number };
  /** One map tile in canvas pixels. */
  normalSize: number;
  /** A marker's side: a tile, or the game's minimum on a zoomed-out map. */
  minSize: number;
  /** How far a marker larger than its tile is shifted to stay centred. */
  squareMargin: number;
};

type TipContent = [content: string, type: string];

type JQueryTipTarget = {
  tip?: (content: string | null, type?: string) => void;
  on?: (events: string, handler: (event: MinimapHoverEvent) => void) => void;
  off?: (events: string) => void;
};

/** The jQuery mouse event the game's own minimap handlers receive. */
export type MinimapHoverEvent = { clientX: number; clientY: number };

type MinimapRuntimeWindow = Window & {
  $?: (element: Element) => JQueryTipTarget;
  Engine?: {
    miniMapController?: {
      handHeldMiniMapController?: {
        canUpdate?: (type: string, kind: string) => void;
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
          ) => void;
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

// The game stores a colour with or without its hash.
const BARE_HEX_COLOR = /^[0-9a-f]{6}$/i;

const isMinimapIcon = (icon: unknown): icon is MinimapIcon =>
  icon === MINIMAP_ICON.square ||
  icon === MINIMAP_ICON.circle ||
  icon === MINIMAP_ICON.rhomb;

/** The open minimap's canvas and tile sizes; null while it is closed or not built. */
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

/**
 * How the minimap draws clan enemies, or null when the player turned them off
 * in the minimap's own settings.
 */
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

/** Whether the game already answers a hover on this tile with its own tip. */
export function hasMinimapObjectAt(x: number, y: number): boolean {
  return Boolean(
    getController()
      ?.getMiniMapTipController?.()
      ?.getObjectFromCordsArray?.([{ x, y }]),
  );
}

/**
 * The tip html the game builds for a player: nick, level, profession and
 * clan, through every addon hooked into character tips.
 */
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

/** Opens the minimap's own tip at the cursor, as hovering a native marker does. */
export function showMinimapTip(event: MinimapHoverEvent, html: string): void {
  getController()
    ?.getMiniMapTipController?.()
    ?.show?.(event, {
      getTip: () => [html, PLAYER_TIP_TYPE],
      getRef: () => null,
    });
}

/**
 * Follows the cursor over the minimap. The handler is bound through the
 * game's jQuery, so it runs after the game's own, which has by then shown or
 * hidden its tip.
 */
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
    } catch {
      // The canvas is gone with its handlers.
    }
  };
}

/** Gives an element the game's own player tip on hover; null removes it. */
export function setPlayerTip(element: Element, html: string | null): void {
  try {
    getRuntimeWindow().$?.(element).tip?.(html, PLAYER_TIP_TYPE);
  } catch {
    // The row keeps its previous tip.
  }
}
