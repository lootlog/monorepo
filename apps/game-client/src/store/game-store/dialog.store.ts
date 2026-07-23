import { create } from "zustand";
import type { NpcSnapshot } from "@/store/npcs.store";

export type DialogNpcContextSource =
  | "dialog-event"
  | "fallback-lookup"
  | "talk-request";

export type DialogNpcContext = {
  npcId: number;
  npc: NpcSnapshot | null;
  source: DialogNpcContextSource;
};

interface DialogState {
  npcContext: DialogNpcContext | null;
}

interface DialogActions {
  clearNpcContext: () => void;
  setNpcContext: (context: DialogNpcContext) => void;
}

export const useDialogStore = create<DialogState & DialogActions>((set) => ({
  npcContext: null,

  clearNpcContext: () => set({ npcContext: null }),
  setNpcContext: (npcContext) => set({ npcContext }),
}));
