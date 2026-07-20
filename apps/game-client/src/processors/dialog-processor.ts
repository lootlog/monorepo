import { logLootCreateDebug } from "@/lib/loot-create-debug";
import { useDialogStore } from "@/store/game-store/dialog.store";
import type { GameEvent } from "@lootlog/margonem/game-events";

export class DialogProcessor {
  handle(event: GameEvent): void {
    if (!event.d || !Array.isArray(event.d) || event.d.length < 3) return;

    const npcId = event.d[2];

    if (npcId && typeof npcId === "string") {
      useDialogStore.getState().setTalkingNpcId(npcId);
      logLootCreateDebug("dialog-npc-tracked", {
        dialog: event.d,
        npcId,
      });
    }
  }
}
