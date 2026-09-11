import { create } from "zustand";

export type SettingsSaveStatus = "idle" | "saving" | "saved" | "error";

interface SettingsSaveStatusState {
  status: SettingsSaveStatus;
  savedAt: number | null;
  /** Re-sends the write that failed; set together with the "error" status. */
  retry: (() => void) | null;
  setStatus: (status: SettingsSaveStatus, retry?: () => void) => void;
}

export const useSettingsSaveStatusStore = create<SettingsSaveStatusState>()(
  (set) => ({
    status: "idle",
    savedAt: null,
    retry: null,
    setStatus: (status, retry) => {
      if (status === "saved") {
        set({ status, savedAt: Date.now(), retry: null });

        return;
      }

      set({ status, retry: status === "error" ? (retry ?? null) : null });
    },
  }),
);

export const useSettingsSaveStatus = () =>
  useSettingsSaveStatusStore((state) => state.status);

/**
 * Reports one write that runs outside the settings patch queue (a plain
 * mutation) to the title bar indicator, with a retry for the failed call.
 */
export const reportSettingsSave = {
  saving: () => useSettingsSaveStatusStore.getState().setStatus("saving"),
  saved: () => useSettingsSaveStatusStore.getState().setStatus("saved"),
  failed: (retry: () => void) =>
    useSettingsSaveStatusStore.getState().setStatus("error", retry),
};
