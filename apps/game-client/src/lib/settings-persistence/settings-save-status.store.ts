import { create } from "zustand";

export type SettingsSaveStatus = "idle" | "saving" | "saved" | "error";

export type SettingsSaveMarkStatus = "saving" | "saved" | "error";

export type SettingsSaveMark = { status: SettingsSaveMarkStatus; at: number };

const KEY_MARK_VISIBLE_MS = 1500;

interface SettingsSaveStatusState {
  status: SettingsSaveStatus;
  savedAt: number | null;
  retry: (() => void) | null;
  keyMarks: Record<string, SettingsSaveMark>;
  setStatus: (status: SettingsSaveStatus, retry?: () => void) => void;
  markKeys: (keys: readonly string[], status: SettingsSaveMarkStatus) => void;
}

const keyMarkTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

export const useSettingsSaveStatusStore = create<SettingsSaveStatusState>()((
  set,
  get,
) => {
  const markKeys: SettingsSaveStatusState["markKeys"] = (keys, status) => {
    if (keys.length === 0) return;
    const at = Date.now();

    set((state) => {
      const keyMarks = { ...state.keyMarks };

      for (const key of keys) keyMarks[key] = { status, at };

      return { keyMarks };
    });

    for (const key of keys) {
      const existing = keyMarkTimeouts.get(key);

      if (existing) clearTimeout(existing);
      keyMarkTimeouts.delete(key);

      if (status === "saving") continue;

      keyMarkTimeouts.set(
        key,
        setTimeout(() => {
          keyMarkTimeouts.delete(key);

          set((state) => {
            if (state.keyMarks[key]?.at !== at) return state;
            const { [key]: _cleared, ...keyMarks } = state.keyMarks;

            return { keyMarks };
          });
        }, KEY_MARK_VISIBLE_MS),
      );
    }
  };

  const resolveSavingKeys = (status: "saved" | "error") => {
    const savingKeys = Object.entries(get().keyMarks)
      .filter(([, mark]) => mark.status === "saving")
      .map(([key]) => key);

    markKeys(savingKeys, status);
  };

  return {
    status: "idle",
    savedAt: null,
    retry: null,
    keyMarks: {},
    setStatus: (status, retry) => {
      if (status === "saved") {
        set({ status, savedAt: Date.now(), retry: null });
        resolveSavingKeys("saved");

        return;
      }

      if (status === "error") resolveSavingKeys("error");
      set({ status, retry: status === "error" ? (retry ?? null) : null });
    },
    markKeys,
  };
});

export const settingsKeyMatches = (rowKey: string, savedKey: string) =>
  rowKey === savedKey ||
  savedKey.startsWith(`${rowKey}.`) ||
  rowKey.startsWith(`${savedKey}.`);

export const useSettingsKeysSaveMark = (
  settingKeys: readonly string[] | undefined,
) =>
  useSettingsSaveStatusStore((state) => {
    if (!settingKeys || settingKeys.length === 0) return null;
    let match: SettingsSaveMark | null = null;

    for (const [savedKey, mark] of Object.entries(state.keyMarks)) {
      if (!settingKeys.some((rowKey) => settingsKeyMatches(rowKey, savedKey))) {
        continue;
      }

      if (
        !match ||
        (mark.status === "saving" && match.status !== "saving") ||
        (mark.status !== "saving" &&
          match.status !== "saving" &&
          mark.at > match.at)
      ) {
        match = mark;
      }
    }

    return match;
  });

export const useSettingsSaveStatus = () =>
  useSettingsSaveStatusStore((state) => state.status);

export const reportSettingsSave = {
  saving: (keys: readonly string[] = []) => {
    const store = useSettingsSaveStatusStore.getState();
    store.markKeys(keys, "saving");
    store.setStatus("saving");
  },
  saved: () => useSettingsSaveStatusStore.getState().setStatus("saved"),
  failed: (retry: () => void) =>
    useSettingsSaveStatusStore.getState().setStatus("error", retry),
};
