import { useDialogStore } from "@/store/game-store/dialog.store";
import { margonemRuntimeBridge } from "./margonem-runtime-bridge";

export class RuntimeInteractionCoordinator {
  private unsubscribe: (() => void) | null = null;

  install(): void {
    this.cleanup();
    this.unsubscribe = margonemRuntimeBridge.subscribeIntent((intent) => {
      if (intent.type !== "talk") return;
      const existing = useDialogStore.getState().npcContext;
      if (existing?.npcId === intent.npcId && existing.npc && !intent.npc) {
        return;
      }
      useDialogStore.getState().setNpcContext({
        npc: intent.npc,
        npcId: intent.npcId,
        source: "talk-request",
      });
    });
  }

  cleanup(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    useDialogStore.getState().clearNpcContext();
  }
}

export const runtimeInteractionCoordinator =
  new RuntimeInteractionCoordinator();
