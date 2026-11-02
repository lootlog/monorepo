import { normalizeChatAppearanceSettings } from "@lootlog/domain/chat-appearance";
import { normalizeNpcTypeColors } from "@lootlog/domain/npc-appearance";
import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import type { NpcTypeColors } from "@lootlog/schema/npc-appearance";
import {
  memoizeByDocuments,
  selectSettingsDomain,
  type SettingsDocuments,
} from "./settings-documents";
import { useSettingsDocuments } from "./use-settings-documents";

const defaultChatAppearance = normalizeChatAppearanceSettings(undefined);

const defaultNpcColors = normalizeNpcTypeColors(undefined);

const projectChatAppearance = memoizeByDocuments((documents) =>
  normalizeChatAppearanceSettings(
    selectSettingsDomain(documents, "appearance")?.effective.chat,
  ),
);

const projectNpcTypeColors = memoizeByDocuments((documents) =>
  normalizeNpcTypeColors(
    selectSettingsDomain(documents, "appearance")?.effective.npcColors,
  ),
);

export const getChatAppearanceFromDocuments = (
  documents: SettingsDocuments | undefined,
): ChatAppearanceSettings =>
  documents ? projectChatAppearance(documents) : defaultChatAppearance;

const getNpcTypeColorsFromDocuments = (
  documents: SettingsDocuments | undefined,
): NpcTypeColors =>
  documents ? projectNpcTypeColors(documents) : defaultNpcColors;

export const useChatAppearanceSettings = () => {
  const query = useSettingsDocuments();

  return {
    ...query,
    chatAppearance: getChatAppearanceFromDocuments(query.data),
  };
};

export const useNpcTypeColors = () => {
  const query = useSettingsDocuments();

  return { ...query, npcTypeColors: getNpcTypeColorsFromDocuments(query.data) };
};
