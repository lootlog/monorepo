import type { WindowPosition, WindowSize } from "@/hooks/ui/window-viewport";
import type { WindowId } from "@/store/windows.store";
import { recordKeys } from "@/utils/record-keys";

const GAME_TOP_BAR_HEIGHT = 60;

const GAME_BOTTOM_BAR_HEIGHT = 60;

const GAME_LEFT_COLUMN_WIDTH = 245;

const GAME_RIGHT_COLUMN_WIDTH = 251;

const WINDOW_GAP = 8;

const HERO_CLEARANCE: WindowSize = { width: 128, height: 144 };

const PROMPT_CASCADE_OFFSET = 24;

type Zone = "pinned" | "alerts" | "tools" | "prompts";

type WindowSlot =
  | { zone: "pinned" | "alerts" | "tools" }
  | { zone: "prompts"; cascadeStep: number };

const WINDOW_SLOTS: Record<WindowId, WindowSlot> = {
  "quick-access": { zone: "pinned" },
  timers: { zone: "pinned" },
  chat: { zone: "pinned" },
  "npc-detector": { zone: "alerts" },
  notifications: { zone: "alerts" },
  "battle-pings": { zone: "alerts" },
  "loot-split": { zone: "alerts" },
  "online-players": { zone: "tools" },
  "global-chat": { zone: "tools" },
  "party-finder": { zone: "tools" },
  "create-party-gathering": { zone: "tools" },
  "hero-sightings": { zone: "tools" },
  "extension-login": { zone: "prompts", cascadeStep: 0 },
  "app-error": { zone: "prompts", cascadeStep: 0 },
  settings: { zone: "prompts", cascadeStep: 0 },
  "backend-preferences-warning": { zone: "prompts", cascadeStep: 1 },
  "catching-whitelist-warning": { zone: "prompts", cascadeStep: 2 },
  command: { zone: "prompts", cascadeStep: 0 },
};

type StackZone = Exclude<Zone, "prompts">;

const STACKED_WINDOWS = recordKeys(WINDOW_SLOTS).flatMap((id) => {
  const { zone } = WINDOW_SLOTS[id];

  return zone === "prompts" ? [] : [{ id, zone }];
});

const STACK_ZONES: Record<
  StackZone,
  {
    anchor: "left" | "right";
    avoid: readonly StackZone[];
    preferClearOf: readonly StackZone[];
    clearOfHero: boolean;
  }
> = {
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

const placeInStack = (
  zone: StackZone,
  size: WindowSize,
  placed: readonly PlacedRect[],
  viewport: WindowSize,
): WindowPosition => {
  const { anchor, avoid, preferClearOf, clearOfHero } = STACK_ZONES[zone];
  const map = resolveMapBounds(viewport);
  const mapAndChat = { ...map, left: 0 };
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
  ) => {
    const clearZones = new Set(clearOf);

    return columns
      .flatMap((x) => rows.map((y) => ({ x, y, ...size })))
      .find(
        (rect) =>
          rect.x >= bounds.left &&
          rect.x + rect.width <= bounds.right &&
          rect.y >= bounds.top &&
          rect.y + rect.height <= bounds.bottom &&
          !(keepHeroVisible && overlaps(rect, hero)) &&
          !placed.some(
            (other) => clearZones.has(other.zone) && overlaps(rect, other),
          ),
      );
  };

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

  return {
    x: Math.round((viewport.width - size.width) / 2) + offset,
    y:
      aboveHero >= map.top
        ? aboveHero
        : Math.round((viewport.height - size.height) / 2) + offset,
  };
};

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
