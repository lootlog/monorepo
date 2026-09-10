import { create } from "zustand";

export type SettingsSaveStatus = "idle" | "saving" | "saved" | "error";

interface SettingsSaveStatusState {
  status: SettingsSaveStatus;
  savedAt: number | null;
  setStatus: (status: SettingsSaveStatus) => void;
}

export const useSettingsSaveStatusStore = create<SettingsSaveStatusState>()(
  (set) => ({
    status: "idle",
    savedAt: null,
    setStatus: (status) => {
      if (status === "saved") {
        set({ status, savedAt: Date.now() });

        return;
      }

      set({ status });
    },
  }),
);

export const useSettingsSaveStatus = () =>
  useSettingsSaveStatusStore((state) => state.status);
