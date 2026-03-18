import type { GameEvent } from "@/types/margonem/game-events/game-event";

export type Communication = {
  successData: (event: string | GameEvent) => void;
};
