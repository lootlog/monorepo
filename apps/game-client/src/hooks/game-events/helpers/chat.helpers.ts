import type { GameEvent } from "@/types/margonem/game-events/game-event";

export const getLootDistributionMessage = (event: GameEvent) => {
  return event.chat?.channels?.system?.msg?.find(({ msg }) =>
    msg?.includes("Podział łupów"),
  )?.msg;
};
