import { create } from "zustand";
import { useWindowsStore } from "@/store/windows.store";
import {
  getControlLocation,
  type SettingsControlId,
} from "./settings-manifest";

const HIGHLIGHT_DURATION_MS = 1800;

export type SettingsView = "recent" | "path";

interface SettingsUiState {
  query: string;
  selectedResultIndex: number;
  overlayOpen: boolean;
  view: SettingsView;
  highlightedControlId: SettingsControlId | null;
  pendingScrollControlId: SettingsControlId | null;
  expandedGroups: Record<string, boolean>;
  setQuery: (query: string) => void;
  clearQuery: () => void;
  setSelectedResultIndex: (index: number) => void;
  setOverlayOpen: (open: boolean) => void;
  setView: (view: SettingsView) => void;
  setGroupExpanded: (groupId: string, expanded: boolean) => void;
  /** Navigates to the control's subsection, scrolls to it and highlights it. */
  openControl: (controlId: SettingsControlId) => void;
  clearPendingScroll: () => void;
  /** Drops transient search and highlight state when the window closes. */
  reset: () => void;
}

let highlightTimeoutId: ReturnType<typeof setTimeout> | null = null;

export const useSettingsUiStore = create<SettingsUiState>()((set) => ({
  query: "",
  selectedResultIndex: 0,
  overlayOpen: false,
  view: "path",
  highlightedControlId: null,
  pendingScrollControlId: null,
  expandedGroups: {},
  setQuery: (query) => set({ query, selectedResultIndex: 0, view: "path" }),
  clearQuery: () => set({ query: "", selectedResultIndex: 0 }),
  setSelectedResultIndex: (selectedResultIndex) => set({ selectedResultIndex }),
  setOverlayOpen: (overlayOpen) => set({ overlayOpen }),
  setView: (view) => set({ view }),
  setGroupExpanded: (groupId, expanded) =>
    set((state) => ({
      expandedGroups: { ...state.expandedGroups, [groupId]: expanded },
    })),
  openControl: (controlId) => {
    const location = getControlLocation(controlId);

    if (!location) return;
    useWindowsStore
      .getState()
      .setSettingsPath(location.domain, location.subsection);

    if (highlightTimeoutId) clearTimeout(highlightTimeoutId);

    highlightTimeoutId = setTimeout(() => {
      highlightTimeoutId = null;
      set({ highlightedControlId: null });
    }, HIGHLIGHT_DURATION_MS);

    set({
      query: "",
      selectedResultIndex: 0,
      overlayOpen: false,
      view: "path",
      highlightedControlId: controlId,
      pendingScrollControlId: controlId,
    });
  },
  clearPendingScroll: () => set({ pendingScrollControlId: null }),
  reset: () => {
    if (highlightTimeoutId) clearTimeout(highlightTimeoutId);
    highlightTimeoutId = null;
    set({
      query: "",
      selectedResultIndex: 0,
      overlayOpen: false,
      highlightedControlId: null,
      pendingScrollControlId: null,
    });
  },
}));
