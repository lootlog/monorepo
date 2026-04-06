import type { GameEvent } from "@lootlog/margonem-types/game-events";

export const getLootDistributionMessage = (event: GameEvent) => {
  return event.chat?.channels?.system?.msg?.find(({ msg }) =>
    msg?.includes("Podział łupów"),
  )?.msg;
};
