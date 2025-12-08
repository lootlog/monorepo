import { useCallback, useRef } from "react";
import type { GameEvent } from "@/types/margonem/game-events/game-event";

declare const Game: {
  map: {
    name: string;
  };
};

export const useAfkHandler = () => {
  const previousStasis = useRef<number | null>(null);

  const handleAfkEvent = useCallback(
    (
      event: GameEvent,
      onAfkChange?: (isAfk: boolean, mapName: string) => void,
    ) => {
      if (event.h?.stasis === undefined) return;

      const isAfk = event.h.stasis === 1;

      if (previousStasis.current !== event.h.stasis) {
        previousStasis.current = event.h.stasis;
        onAfkChange?.(isAfk, Game.map.name);
      }
    },
    [],
  );

  return { handleAfkEvent };
};
