import type { WindowPosition, WindowSize } from "@/hooks/ui/window-viewport";
import type { WindowId } from "@/store/windows.store";

/**
 * Margonem's interface frames the map with 60px bars at the top and bottom, a
 * 245px chat column on the left and a 251px equipment column on the right.
 * The camera follows the hero, so the hero stands at the middle of the map,
 * which is the middle of the viewport. Default placements keep to open map,
 * off the game HUD and off the hero. Smaller or differently arranged layouts
 * are handled by the display clamp.
 */
const GAME_TOP_BAR_HEIGHT = 60;

const GAME_BOTTOM_BAR_HEIGHT = 60;

const GAME_LEFT_COLUMN_WIDTH = 245;

const GAME_RIGHT_COLUMN_WIDTH = 251;

const WINDOW_GAP = 8;

/** The hero and the tiles around it stay visible: four tiles wide, 4.5 tall. */
const HERO_CLEARANCE: WindowSize = { width: 128, height: 144 };

/** Keeps prompts that can open together from sitting exactly on each other. */
const PROMPT_CASCADE_OFFSET = 24;

type Zone = "pinned" | "alerts" | "tools" | "prompts";

/**
 * - `pinned`: open from the start, stacked down the map's top-right corner.
 * - `alerts`: open on their own when something happens in the game, stacked
 *   down the map's top-left corner.
 * - `tools`: opened by the player, stacked beside the pinned windows.
 * - `prompts`: dialogs that need an answer, centered horizontally just above
 *   the hero, or centered when too tall for that; a prompt that can open
 *   while another is up takes the next cascade step.
 */
type WindowSlot =
  | { zone: "pinned" | "alerts" | "tools" }
  | { zone: "prompts"; cascadeStep: number };

/**
 * Every window's slot, with each zone's windows in stacking order: an earlier
 * window keeps its place and later ones fit around it.
 */
const WINDOW_SLOTS: Record<WindowId, WindowSlot> = {
  "quick-access": { zone: "pinned" },
  timers: { zone: "pinned" },
  chat: { zone: "pinned" },
  "npc-detector": { zone: "alerts" },
  notifications: { zone: "alerts" },
  "battle-pings": { zone: "alerts" },
  "online-players": { zone: "tools" },
  "global-chat": { zone: "tools" },
  "party-finder": { zone: "tools" },
  "create-party-gathering": { zone: "tools" },
  // The login and error screens replace the game UI, so nothing opens beside them.
  "extension-login": { zone: "prompts", cascadeStep: 0 },
  "app-error": { zone: "prompts", cascadeStep: 0 },
  settings: { zone: "prompts", cascadeStep: 0 },
  "backend-preferences-warning": { zone: "prompts", cascadeStep: 1 },
  "catching-whitelist-warning": { zone: "prompts", cascadeStep: 2 },
  // The quick chat overlay places itself; it never uses this position.
  command: { zone: "prompts", cascadeStep: 0 },
};

type StackZone = Exclude<Zone, "prompts">;

// SAFETY: WINDOW_SLOTS is a Record<WindowId, WindowSlot> literal, so its own
// keys are exactly the window ids.
const STACKED_WINDOWS = (Object.keys(WINDOW_SLOTS) as WindowId[]).flatMap(
  (id) => {
    const { zone } = WINDOW_SLOTS[id];

    return zone === "prompts" ? [] : [{ id, zone }];
  },
);

/**
 * A stacked window fills its column from the anchor corner downwards, then
 * starts the next column towards the middle. It never covers `avoid` zones;
 * it also stays clear of `preferClearOf` and of the hero while there is room.
 */
const STACK_ZONES: Record<
  StackZone,
  {
    anchor: "left" | "right";
    avoid: readonly StackZone[];
    preferClearOf: readonly StackZone[];
    clearOfHero: boolean;
  }
> = {
  // Clears the hero from 1280px up; on narrower maps the column keeps its
  // shape under the quick access bar instead of scattering.
  pinned: {
    anchor: "right",
    avoid: ["pinned"],
    preferClearOf: [],
    clearOfHero: false,
  },
  alerts: {
    anchor: "left",
    avoid: ["pinned", "alerts"],
    preferClearOf: [],
    clearOfHero: true,
  },
  // A tool the player opens may cover an alert on a small screen, but never
  // the windows open from the start or another tool.
  tools: {
    anchor: "right",
    avoid: ["pinned", "tools"],
    preferClearOf: ["alerts"],
    clearOfHero: true,
  },
};

type Rect = WindowPosition & WindowSize;

type PlacedRect = Rect & { zone: StackZone };

type WindowLayoutSizes = (id: WindowId) => WindowSize;

const overlaps = (first: Rect, second: Rect) =>
  first.x < second.x + second.width &&
  second.x < first.x + first.width &&
  first.y < second.y + second.height &&
  second.y < first.y + first.height;

const resolveMapBounds = (viewport: WindowSize) => ({
  left: GAME_LEFT_COLUMN_WIDTH + WINDOW_GAP,
  right: viewport.width - GAME_RIGHT_COLUMN_WIDTH - WINDOW_GAP,
  top: GAME_TOP_BAR_HEIGHT + WINDOW_GAP,
  bottom: viewport.height - GAME_BOTTOM_BAR_HEIGHT - WINDOW_GAP,
});

const resolveHeroClearance = (viewport: WindowSize): Rect => ({
  x: Math.round((viewport.width - HERO_CLEARANCE.width) / 2),
  y: Math.round((viewport.height - HERO_CLEARANCE.height) / 2),
  ...HERO_CLEARANCE,
});

type Bounds = { left: number; right: number; top: number; bottom: number };

/**
 * The first free spot for a stacked window: column by column from the anchor
 * corner, top to bottom, against the edges of the windows already placed.
 * Keeping the hero visible outranks keeping the game's chat column visible;
 * when nothing fits, the window takes the map corner.
 */
const placeInStack = (
  zone: StackZone,
  size: WindowSize,
  placed: readonly PlacedRect[],
  viewport: WindowSize,
): WindowPosition => {
  const { anchor, avoid, preferClearOf, clearOfHero } = STACK_ZONES[zone];
  const map = resolveMapBounds(viewport);
  // The game's chat column is the only HUD a default window may cover; the
  // equipment column and the bars stay reachable.
  const mapAndChat = { ...map, left: 0 };
  // Only a map too short for the stack pushes a window over the bottom bar.
  const mapChatAndBottomBar = { ...mapAndChat, bottom: viewport.height };
  const hero = resolveHeroClearance(viewport);

  const columns =
    anchor === "right"
      ? [
          map.right - size.width,
          ...placed.map((rect) => rect.x - WINDOW_GAP - size.width),
        ].sort((first, second) => second - first)
      : [
          map.left,
          mapAndChat.left,
          ...placed.map((rect) => rect.x + rect.width + WINDOW_GAP),
        ].sort((first, second) => first - second);

  const rows = [
    map.top,
    ...placed.map((rect) => rect.y + rect.height + WINDOW_GAP),
  ].sort((first, second) => first - second);

  const findFreeSpot = (
    bounds: Bounds,
    clearOf: readonly StackZone[],
    keepHeroVisible: boolean,
  ) =>
    columns
      .flatMap((x) => rows.map((y) => ({ x, y, ...size })))
      .find(
        (rect) =>
          rect.x >= bounds.left &&
          rect.x + rect.width <= bounds.right &&
          rect.y >= bounds.top &&
          rect.y + rect.height <= bounds.bottom &&
          !(keepHeroVisible && overlaps(rect, hero)) &&
          !placed.some(
            (other) => clearOf.includes(other.zone) && overlaps(rect, other),
          ),
      );

  const spot =
    findFreeSpot(map, [...avoid, ...preferClearOf], clearOfHero) ??
    findFreeSpot(map, avoid, clearOfHero) ??
    findFreeSpot(mapAndChat, avoid, clearOfHero) ??
    findFreeSpot(map, avoid, false) ??
    findFreeSpot(mapAndChat, avoid, false) ??
    findFreeSpot(mapChatAndBottomBar, avoid, false);

  if (spot) return { x: spot.x, y: spot.y };

  return {
    x: anchor === "right" ? map.right - size.width : map.left,
    y: map.top,
  };
};

const placePrompt = (
  cascadeStep: number,
  size: WindowSize,
  viewport: WindowSize,
): WindowPosition => {
  const map = resolveMapBounds(viewport);
  const hero = resolveHeroClearance(viewport);
  const offset = cascadeStep * PROMPT_CASCADE_OFFSET;

  const aboveHero = hero.y - WINDOW_GAP - size.height - offset;

  // Later steps cascade up and right above the hero, down and right when the
  // prompt is too tall to clear it and sits centered instead.
  return {
    x: Math.round((viewport.width - size.width) / 2) + offset,
    y:
      aboveHero >= map.top
        ? aboveHero
        : Math.round((viewport.height - size.height) / 2) + offset,
  };
};

/**
 * Where a window sits until the player moves it, recomputed from the current
 * viewport so the layout follows browser resizes. The layout depends only on
 * window sizes, never on which windows are open, so a window always opens in
 * the same place and never jumps when another one opens or closes.
 */
export const resolveDefaultWindowPosition = (
  id: WindowId,
  sizeOf: WindowLayoutSizes,
  viewport: WindowSize,
): WindowPosition => {
  const slot = WINDOW_SLOTS[id];

  if (slot.zone === "prompts") {
    return placePrompt(slot.cascadeStep, sizeOf(id), viewport);
  }

  const placed: PlacedRect[] = [];

  // Windows stacked earlier keep their place whatever comes after them.
  for (const earlier of STACKED_WINDOWS.slice(
    0,
    STACKED_WINDOWS.findIndex((stacked) => stacked.id === id),
  )) {
    const size = sizeOf(earlier.id);

    placed.push({
      ...placeInStack(earlier.zone, size, placed, viewport),
      ...size,
      zone: earlier.zone,
    });
  }

  return placeInStack(slot.zone, sizeOf(id), placed, viewport);
};
