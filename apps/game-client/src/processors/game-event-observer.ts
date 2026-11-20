import type { GameEvent } from "@lootlog/margonem/game-events";

/**
 * A feature's reaction to game facts. The composition root supplies these, so
 * the shared event pipeline does not import features.
 */
export interface GameEventObserver {
  /** Margonem reloaded the map without deleting its players. */
  reload?: () => void;
  /** Other players appeared on, moved on, or left the current map. */
  other?: (other: NonNullable<GameEvent["other"]>) => void;
  /** The hero entered another map, after Lootlog published its presence there. */
  mapChange?: (mapId: number) => void;
}
