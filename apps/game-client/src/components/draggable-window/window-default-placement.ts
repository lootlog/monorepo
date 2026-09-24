import type { WindowPosition, WindowSize } from "@/hooks/ui/window-viewport";
import type { WindowId } from "@/store/windows.store";

/**
 * Margonem's interface frames the map with 60px bars at the top and bottom, a
 * 245px chat column on the left and a 251px equipment column on the right, and
 * opens its own windows in the middle. Default placements sit just inside the
 * map corners so they cover open map instead of game HUD. Smaller or
 * differently arranged layouts are handled by the display clamp.
 */
const GAME_TOP_BAR_HEIGHT = 60;

const GAME_BOTTOM_BAR_HEIGHT = 60;

const GAME_LEFT_COLUMN_WIDTH = 245;

const GAME_RIGHT_COLUMN_WIDTH = 251;

const WINDOW_GAP = 8;

const MAP_TOP = GAME_TOP_BAR_HEIGHT + WINDOW_GAP;

type SizeOf = (id: WindowId) => WindowSize;

/**
 * Windows open from the start stack down the map's top-right corner. The chat
 * moves beside the timers when the column would reach the bottom bar.
 */
const resolveRightColumnPosition = (
  id: "quick-access" | "timers" | "chat",
  sizeOf: SizeOf,
  viewport: WindowSize,
): WindowPosition => {
  const right = viewport.width - GAME_RIGHT_COLUMN_WIDTH - WINDOW_GAP;
  const quickAccess = sizeOf("quick-access");

  if (id === "quick-access") {
    return { x: right - quickAccess.width, y: MAP_TOP };
  }

  const timers = sizeOf("timers");

  const timersPosition = {
    x: right - timers.width,
    y: MAP_TOP + quickAccess.height + WINDOW_GAP,
  };

  if (id === "timers") return timersPosition;

  const chat = sizeOf("chat");
  const chatTop = timersPosition.y + timers.height + WINDOW_GAP;
  const mapBottom = viewport.height - GAME_BOTTOM_BAR_HEIGHT - WINDOW_GAP;

  if (chatTop + chat.height <= mapBottom) {
    return { x: right - chat.width, y: chatTop };
  }

  return {
    x: timersPosition.x - WINDOW_GAP - chat.width,
    y: timersPosition.y,
  };
};

/**
 * Windows that open on their own when something happens in the game stack
 * down the map's top-left corner, away from the windows open from the start.
 */
const resolveLeftColumnPosition = (
  id: "npc-detector" | "notifications",
  sizeOf: SizeOf,
): WindowPosition => {
  const left = GAME_LEFT_COLUMN_WIDTH + WINDOW_GAP;

  if (id === "npc-detector") return { x: left, y: MAP_TOP };

  // Both grow with their content up to the stored size, so stacking on that
  // upper bound keeps them apart at any fill level.
  return {
    x: left,
    y: MAP_TOP + sizeOf("npc-detector").height + WINDOW_GAP,
  };
};

/**
 * Where a window sits until the player moves it, recomputed from the current
 * viewport so edge-anchored windows follow browser resizes. Windows the player
 * opens on demand (settings, command palette, prompts) start centered.
 */
export const resolveDefaultWindowPosition = (
  id: WindowId,
  sizeOf: SizeOf,
  viewport: WindowSize,
): WindowPosition => {
  switch (id) {
    case "quick-access":
    case "timers":
    case "chat":
      return resolveRightColumnPosition(id, sizeOf, viewport);
    case "npc-detector":
    case "notifications":
      return resolveLeftColumnPosition(id, sizeOf);
    default: {
      const size = sizeOf(id);

      return {
        x: Math.max(0, Math.round((viewport.width - size.width) / 2)),
        y: Math.max(0, Math.round((viewport.height - size.height) / 2)),
      };
    }
  }
};
