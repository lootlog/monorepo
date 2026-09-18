import { create } from "zustand";

/** Below the wide layout only one of these panels is visible at a time. */
export type BattleDetailPanel = "log" | "stats" | "recent";

type BattleDetailPanelState = {
  activePanel: BattleDetailPanel;
  setActivePanel: (activePanel: BattleDetailPanel) => void;
};

/**
 * Lives outside the view so the chosen panel survives moving between battles, including the
 * remount when the route shows its pending skeleton. It is not persisted: a new session
 * starts on the statistics again.
 */
export const useBattleDetailPanelStore = create<BattleDetailPanelState>()(
  (set) => ({
    activePanel: "stats",
    setActivePanel: (activePanel) => set({ activePanel }),
  }),
);
