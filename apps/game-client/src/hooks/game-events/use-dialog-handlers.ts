import { useDialogStore } from "@/store/game-store/dialog.store";
import type { GameEvent } from "@/types/margonem/game-events/game-event";

export const useDialogHandlers = () => {
  const handleDialogEvents = (event: GameEvent) => {
    if (!event.d) return;

    if (event.d[2]) {
      useDialogStore.getState().setTalkingNpcId(event.d[2]);
    }
  };

  return {
    handleDialogEvents,
  };
};
