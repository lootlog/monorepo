/**
 * Where players stand, for effects drawn on the ground under them. NI draws
 * the map on a canvas, so a point is in main-canvas pixels; SI positions
 * characters as elements of `#base`, so a point is in that layer's pixels.
 * Both are the middle of the bottom edge of the player's tile.
 */
export type GroundPoint = { x: number; y: number };

type PositionedCharacter = {
  d?: { id?: number | string; x?: number; y?: number };
  rx?: number;
  ry?: number;
};

type GroundRuntimeWindow = Window & {
  CFG?: { tileSize?: number };
  Engine?: {
    hero?: PositionedCharacter;
    map?: { offset?: [number, number] };
    mapShift?: { getShift?: () => [number, number] };
    others?: { getById?: (id: string) => PositionedCharacter | undefined };
  };
  // SI: g.other holds players by id; window.hero is the hero itself.
  g?: {
    other?: Record<
      string,
      { rx?: number; ry?: number; x?: number; y?: number } | undefined
    >;
  };
  hero?: { id?: number | string; rx?: number; ry?: number };
};

const TILE_SIZE = 32;

const LEGACY_MAP_LAYER_ID = "base";

const getRuntimeWindow = (): GroundRuntimeWindow => window;

const toTilePosition = (
  rx: number | undefined,
  ry: number | undefined,
  x: number | undefined,
  y: number | undefined,
) => {
  const tileX = rx ?? x;
  const tileY = ry ?? y;

  return tileX === undefined || tileY === undefined
    ? null
    : { x: tileX, y: tileY };
};

/** The NI hero or another NI player on the map, by Margonem character id. */
export const getCanvasPlayerGroundPoint = (
  characterId: string,
): GroundPoint | null => {
  const engine = getRuntimeWindow().Engine;
  const map = engine?.map;

  if (!map) return null;

  const hero = engine.hero;

  const character =
    hero?.d?.id !== undefined && String(hero.d.id) === characterId
      ? hero
      : engine.others?.getById?.(characterId);

  if (!character) return null;

  const tile = toTilePosition(
    character.rx,
    character.ry,
    character.d?.x,
    character.d?.y,
  );

  if (!tile) return null;

  const tileSize = getRuntimeWindow().CFG?.tileSize ?? TILE_SIZE;
  const offset = map.offset ?? [0, 0];
  const shift = engine.mapShift?.getShift?.() ?? [0, 0];

  return {
    x: tile.x * tileSize + tileSize / 2 - offset[0] - shift[0],
    y: tile.y * tileSize + tileSize - offset[1] - shift[1],
  };
};

/** The SI layer that holds the map's characters (`#base`). */
export const getLegacyMapLayer = (): HTMLElement | null =>
  document.getElementById(LEGACY_MAP_LAYER_ID);

/** The SI hero or another SI player on the map, by Margonem character id. */
export const getLegacyPlayerGroundPoint = (
  characterId: string,
): GroundPoint | null => {
  const runtimeWindow = getRuntimeWindow();
  const hero = runtimeWindow.hero;

  const character =
    hero?.id !== undefined && String(hero.id) === characterId
      ? { rx: hero.rx, ry: hero.ry, x: undefined, y: undefined }
      : runtimeWindow.g?.other?.[characterId];

  if (!character) return null;

  const tile = toTilePosition(
    character.rx,
    character.ry,
    character.x,
    character.y,
  );

  return tile
    ? {
        x: tile.x * TILE_SIZE + TILE_SIZE / 2,
        y: tile.y * TILE_SIZE + TILE_SIZE,
      }
    : null;
};
