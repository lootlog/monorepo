import type { GameEvent } from "@lootlog/margonem/game-events";

export interface GameEventObserver {
  reload?: () => void;
  other?: (other: NonNullable<GameEvent["other"]>) => void;
  mapChange?: (mapId: number) => void;
}
