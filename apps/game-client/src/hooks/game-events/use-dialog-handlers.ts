import { useDialogStore } from "@/store/game-store/dialog.store";
import type { GameEvent } from "@/types/margonem/game-events/game-event";

export const useDialogHandlers = () => {
  const handleDialogEvents = (event: GameEvent) => {
    if (!event.d || !Array.isArray(event.d) || event.d.length < 3) return;

    const npcId = event.d[2];

    if (npcId && typeof npcId === "string") {
      useDialogStore.getState().setTalkingNpcId(npcId);
    }
  };

  return {
    handleDialogEvents,
  };
};
