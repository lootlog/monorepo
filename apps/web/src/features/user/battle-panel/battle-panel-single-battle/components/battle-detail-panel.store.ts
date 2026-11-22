import { create } from "zustand";

export type BattleDetailPanel = "log" | "recent";

type BattleDetailPanelState = {
  activePanel: BattleDetailPanel;
  setActivePanel: (activePanel: BattleDetailPanel) => void;
};

export const useBattleDetailPanelStore = create<BattleDetailPanelState>()(
  (set) => ({
    activePanel: "log",
    setActivePanel: (activePanel) => set({ activePanel }),
  }),
);
