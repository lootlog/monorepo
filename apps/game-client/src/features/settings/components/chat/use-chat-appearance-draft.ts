import { enqueueSettingsPatch } from "@/features/settings/persistence/settings-patch-client";
import { useSettingsSaveStatus } from "@/features/settings/persistence/settings-save-status.store";
import {
  useChatAppearanceSettings,
  useNpcTypeColors,
} from "@/features/settings/persistence/use-appearance-settings";
import {
  CHAT_APPEARANCE_COMPACT_PRESET,
  CHAT_APPEARANCE_READABLE_PRESET,
  type ChatAppearanceSettings,
} from "@lootlog/schema/chat-appearance";
import { useState } from "react";

/**
 * Local draft for slider-style controls: the value follows the pointer while
 * dragging and is written through the shared settings patch queue on commit.
 */
export function useChatAppearanceDraft() {
  const { chatAppearance, data } = useChatAppearanceSettings();
  const { npcTypeColors } = useNpcTypeColors();
  const status = useSettingsSaveStatus();

  const [draftState, setDraftState] = useState<{
    source: typeof data;
    value: ChatAppearanceSettings;
  }>({ source: data, value: chatAppearance });

  const draft = draftState.source === data ? draftState.value : chatAppearance;

  const updateDraft = (patch: Partial<ChatAppearanceSettings>) => {
    setDraftState({ source: data, value: { ...draft, ...patch } });
  };

  const commit = (patch: Partial<ChatAppearanceSettings>) => {
    enqueueSettingsPatch({ domain: "appearance", set: { chat: patch } });
  };

  const updateAndCommit = (patch: Partial<ChatAppearanceSettings>) => {
    updateDraft(patch);
    commit(patch);
  };

  const applyPreset = (preset: "readable" | "compact") => {
    updateAndCommit(
      preset === "readable"
        ? CHAT_APPEARANCE_READABLE_PRESET
        : CHAT_APPEARANCE_COMPACT_PRESET,
    );
  };

  return {
    draft,
    saving: status === "saving",
    npcTypeColors,
    updateDraft,
    commit,
    updateAndCommit,
    applyPreset,
  };
}
