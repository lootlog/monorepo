import { create } from "zustand";

export type SettingsSaveStatus = "idle" | "saving" | "saved" | "error";

export type SettingsKeySaveStatus = "saving" | "saved" | "error";

export type SettingsKeySaveMark = { status: SettingsKeySaveStatus; at: number };

/** How long a resolved per-key mark stays before it clears itself. */
const KEY_MARK_VISIBLE_MS = 1500;

interface SettingsSaveStatusState {
  status: SettingsSaveStatus;
  savedAt: number | null;
  /** Re-sends the write that failed; set together with the "error" status. */
  retry: (() => void) | null;
  /**
   * Save state per catalog key (`domain.path`) of the patches in flight, so a
   * row can show which of its settings is being written. Resolved marks
   * clear themselves after a moment.
   */
  keyMarks: Record<string, SettingsKeySaveMark>;
  setStatus: (status: SettingsSaveStatus, retry?: () => void) => void;
  markKeys: (keys: readonly string[], status: SettingsKeySaveStatus) => void;
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

  /** Keys still marked "saving" follow the queue's final status. */
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

/**
 * True when a row bound to `rowKey` is affected by a write to `savedKey`:
 * the same key, a nested path under the row's key, or a parent the row's key
 * lives under (a whole sub-document replaced at once).
 */
export const settingsKeyMatches = (rowKey: string, savedKey: string) =>
  rowKey === savedKey ||
  savedKey.startsWith(`${rowKey}.`) ||
  rowKey.startsWith(`${savedKey}.`);

/** Save mark for a control bound to `settingKeys`, if any of them is marked. */
export const useSettingsKeysSaveMark = (
  settingKeys: readonly string[] | undefined,
) =>
  useSettingsSaveStatusStore((state) => {
    if (!settingKeys || settingKeys.length === 0) return null;
    let match: SettingsKeySaveMark | null = null;

    for (const [savedKey, mark] of Object.entries(state.keyMarks)) {
      if (!settingKeys.some((rowKey) => settingsKeyMatches(rowKey, savedKey))) {
        continue;
      }

      // A pending write outranks a resolved one; among resolved, the latest wins.
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
