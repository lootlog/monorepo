import { logLootCreateDebug } from "@/lib/loot-create-debug";
import { useDialogStore } from "@/store/game-store/dialog.store";
import { useNpcsStore, type NpcSnapshot } from "@/store/npcs.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type { RuntimeIngressSnapshot } from "@/lib/margonem-runtime/runtime.types";

export class DialogProcessor {
  handle(event: GameEvent, ingress?: RuntimeIngressSnapshot): void {
    if (!event.d || !Array.isArray(event.d) || event.d.length < 3) return;

    const npcId = event.d[2];

    if (npcId && typeof npcId === "string") {
      const numericNpcId = Number(npcId);
      if (!Number.isSafeInteger(numericNpcId) || numericNpcId <= 0) {
        return;
      }

      const dialogStore = useDialogStore.getState();
      const existingContext = dialogStore.npcContext;
      if (existingContext?.npcId !== numericNpcId || !existingContext.npc) {
        const npc: NpcSnapshot | null =
          useNpcsStore.getState().getNpc(numericNpcId) ??
          ingress?.npcsById[numericNpcId] ??
          null;

        dialogStore.setNpcContext({
          npcId: numericNpcId,
          npc,
          source: "dialog-event",
        });
      }
      logLootCreateDebug("dialog-npc-tracked", {
        dialog: event.d,
        npcId,
      });
    }
  }
}
