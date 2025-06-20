import { GameEvent } from "@/types/margonem/game-events/game-event";

export const getNpcIconFromEvent = (
  event: GameEvent,
  iconId: number
): string | undefined => {
  return event.icons?.find((icon) => icon.id === iconId)?.icon;
};
