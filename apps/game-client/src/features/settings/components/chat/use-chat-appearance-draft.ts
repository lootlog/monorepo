import { enqueueSettingsPatch } from "@/lib/settings-persistence/settings-patch-client";
import { useChatAppearanceSettings } from "@/lib/settings-persistence/use-appearance-settings";
import {
  CHAT_APPEARANCE_COMPACT_PRESET,
  CHAT_APPEARANCE_READABLE_PRESET,
  type ChatAppearanceSettings,
} from "@lootlog/schema/chat-appearance";
import { useSourceDraft } from "@/features/settings/components/shared/use-source-draft";

export function useChatAppearanceDraft() {
  const { chatAppearance, data } = useChatAppearanceSettings();

  const [draft, setDraft] = useSourceDraft(data, chatAppearance);

  const updateDraft = (patch: Partial<ChatAppearanceSettings>) => {
    setDraft({ ...draft, ...patch });
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
    updateDraft,
    commit,
    updateAndCommit,
    applyPreset,
  };
}
