import { useState } from "react";
import {
  TIMERS_MODERN_COMFORTABLE_PRESET,
  TIMERS_MODERN_COMPACT_PRESET,
  type TimersModernAppearancePreset,
  type TimersModernAppearanceSettings,
} from "@lootlog/schema/timer-settings";
import { setTimersModernAppearance } from "@/features/timers/settings/timer-settings-writers";
import { useTimerAppearanceSettings } from "@/features/timers/settings/use-timer-settings";

/**
 * Local draft for the modern layout's slider controls: the value follows the
 * pointer while dragging and is written through the settings patch queue on
 * commit, the same way the chat appearance form works.
 */
export const useTimersModernAppearanceDraft = () => {
  const { appearance, ready } = useTimerAppearanceSettings();
  const stored = appearance.modern;

  const [draftState, setDraftState] = useState<{
    source: TimersModernAppearanceSettings;
    value: TimersModernAppearanceSettings;
  }>({ source: stored, value: stored });

  const draft = draftState.source === stored ? draftState.value : stored;

  const updateDraft = (patch: Partial<TimersModernAppearanceSettings>) => {
    setDraftState({ source: stored, value: { ...draft, ...patch } });
  };

  const commit = (patch: Partial<TimersModernAppearanceSettings>) => {
    setTimersModernAppearance(patch);
  };

  const updateAndCommit = (patch: Partial<TimersModernAppearanceSettings>) => {
    updateDraft(patch);
    commit(patch);
  };

  const applyPreset = (
    preset: Exclude<TimersModernAppearancePreset, "custom">,
  ) => {
    updateAndCommit(
      preset === "comfortable"
        ? TIMERS_MODERN_COMFORTABLE_PRESET
        : TIMERS_MODERN_COMPACT_PRESET,
    );
  };

  return { draft, ready, updateDraft, commit, updateAndCommit, applyPreset };
};
