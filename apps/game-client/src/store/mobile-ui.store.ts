import { Option, Schema } from "effect";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { looseStruct, optionalOrUndefined } from "@lootlog/schema/stored-value";
import type { WindowPosition } from "@/hooks/ui/window-viewport";
import {
  MOBILE_PANEL_WINDOW_IDS,
  type MobilePanelWindowId,
} from "@/lib/mobile-ui/mobile-windows";
import { storageKey } from "@/lib/storage-key";
import { createChangedOnlyStorage } from "./changed-only-storage";

const STORAGE_KEY = storageKey("ll:mobile-ui:state");

const DEFAULT_PANEL: MobilePanelWindowId = "timers";

interface MobileUiState {
  activePanel: MobilePanelWindowId | null;
  lastPanel: MobilePanelWindowId;
  sheetExpanded: boolean;
  pillPosition: WindowPosition | null;
  openPanel: (panel: MobilePanelWindowId) => void;
  closePanel: () => void;
  togglePanel: (panel: MobilePanelWindowId) => void;
  openLastPanel: () => void;
  toggleSheetExpanded: () => void;
  setPillPosition: (position: WindowPosition) => void;
  resetMobileLayout: () => void;
}

const persistedMobileUiSchema = looseStruct({
  lastPanel: optionalOrUndefined(Schema.Literals(MOBILE_PANEL_WINDOW_IDS)),
  pillPosition: optionalOrUndefined(
    Schema.Struct({
      x: Schema.Finite,
      y: Schema.Finite,
    }),
  ),
});

const decodePersistedMobileUi = Schema.decodeUnknownOption(
  persistedMobileUiSchema,
);

export const useMobileUiStore = create<MobileUiState>()(
  persist(
    (set, get) => ({
      activePanel: null,
      lastPanel: DEFAULT_PANEL,
      sheetExpanded: false,
      pillPosition: null,
      openPanel: (panel) =>
        set((state) =>
          state.activePanel === panel && state.lastPanel === panel
            ? state
            : { activePanel: panel, lastPanel: panel },
        ),
      closePanel: () =>
        set((state) =>
          state.activePanel === null ? state : { activePanel: null },
        ),
      togglePanel: (panel) => {
        if (get().activePanel === panel) {
          get().closePanel();
        } else {
          get().openPanel(panel);
        }
      },
      openLastPanel: () => {
        const panel = get().lastPanel;
        get().openPanel(panel);
      },
      toggleSheetExpanded: () =>
        set((state) => ({ sheetExpanded: !state.sheetExpanded })),
      setPillPosition: (pillPosition) =>
        set((state) =>
          state.pillPosition?.x === pillPosition.x &&
          state.pillPosition?.y === pillPosition.y
            ? state
            : { pillPosition },
        ),
      resetMobileLayout: () =>
        set({
          pillPosition: null,
          sheetExpanded: false,
        }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        lastPanel: state.lastPanel,
        pillPosition: state.pillPosition,
      }),
      storage: createChangedOnlyStorage(createJSONStorage(() => localStorage)),
      version: 1,
      merge: (persisted, current) => {
        const parsed = decodePersistedMobileUi(persisted);

        if (Option.isNone(parsed)) return current;

        return {
          ...current,
          lastPanel: parsed.value.lastPanel ?? current.lastPanel,
          pillPosition: parsed.value.pillPosition ?? null,
        };
      },
    },
  ),
);
