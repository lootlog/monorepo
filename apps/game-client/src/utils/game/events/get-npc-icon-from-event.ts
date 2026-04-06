import type { GameEvent } from "@lootlog/margonem-types/game-events";

export const getNpcIconFromEvent = (
  event: GameEvent,
  iconId: number,
): string | undefined => {
  return event.icons?.find((icon) => icon.id === iconId)?.icon;
};
