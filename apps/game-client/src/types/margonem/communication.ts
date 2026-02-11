import type { GameEvent } from "@/types/margonem/game-events/game-event";

export type Communication = {
  ogSuccessData: ((event: string | GameEvent) => void) | null;
  successData: (event: string | GameEvent) => void;
};
