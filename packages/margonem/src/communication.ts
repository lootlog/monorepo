import type { GameEvent } from "./game-events/game-event.js";

export type Communication = {
  successData: (event: string | GameEvent) => void;
};
