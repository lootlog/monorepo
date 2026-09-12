import { normalizeChatAppearanceSettings } from "@lootlog/domain/chat-appearance";
import { normalizeNpcTypeColors } from "@lootlog/domain/npc-appearance";
import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import type { NpcTypeColors } from "@lootlog/schema/npc-appearance";
import {
  selectSettingsDomain,
  type SettingsDocuments,
} from "./settings-documents";
import { useSettingsDocuments } from "./use-settings-documents";

const chatAppearanceCache = new WeakMap<
  SettingsDocuments,
  ChatAppearanceSettings
>();

const npcColorsCache = new WeakMap<SettingsDocuments, NpcTypeColors>();

const defaultChatAppearance = normalizeChatAppearanceSettings(undefined);

const defaultNpcColors = normalizeNpcTypeColors(undefined);

export const getChatAppearanceFromDocuments = (
  documents: SettingsDocuments | undefined,
): ChatAppearanceSettings => {
  if (!documents) return defaultChatAppearance;
  const cached = chatAppearanceCache.get(documents);

  if (cached) return cached;

  const appearance = normalizeChatAppearanceSettings(
    selectSettingsDomain(documents, "appearance")?.effective.chat,
  );

  chatAppearanceCache.set(documents, appearance);

  return appearance;
};

export const getNpcTypeColorsFromDocuments = (
  documents: SettingsDocuments | undefined,
): NpcTypeColors => {
  if (!documents) return defaultNpcColors;
  const cached = npcColorsCache.get(documents);

  if (cached) return cached;

  const colors = normalizeNpcTypeColors(
    selectSettingsDomain(documents, "appearance")?.effective.npcColors,
  );

  npcColorsCache.set(documents, colors);

  return colors;
};

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
