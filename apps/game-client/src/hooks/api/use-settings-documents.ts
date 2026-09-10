import { isRecord } from "@lootlog/schema/records";
import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  useSettingsDocumentsControllerGetPreferences,
  type SettingsDocumentsControllerGetPreferencesParams,
  type SettingsDocumentsResponseDtoOutput,
} from "@lootlog/client/main";

import {
  DEFAULT_NPC_TYPE_COLORS,
  type NpcTypeColors,
} from "@lootlog/schema/npc-appearance";
import { normalizeChatAppearanceSettings } from "@lootlog/domain/chat-appearance";
import { normalizeNpcTypeColors } from "@lootlog/domain/npc-appearance";
import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import { NpcTypeEnum } from "@lootlog/schema/npc-type";

const NPC_TYPE_VALUES: ReadonlySet<string> = new Set(
  Object.values(NpcTypeEnum),
);

const isNpcType = (value: unknown): value is NpcTypeEnum =>
  typeof value === "string" && NPC_TYPE_VALUES.has(value);

export const getChatAppearanceFromSettingsDocuments = (
  settingsDocuments: SettingsDocumentsResponseDtoOutput | undefined,
) => {
  const appearance = settingsDocuments?.domains.appearance;

  const chat = isRecord(appearance?.effective)
    ? appearance.effective.chat
    : undefined;

  return normalizeChatAppearanceSettings(chat);
};

export const updateChatAppearanceInSettingsDocuments = (
  settingsDocuments: SettingsDocumentsResponseDtoOutput | undefined,
  patch: Partial<ChatAppearanceSettings>,
) => {
  const appearance = settingsDocuments?.domains.appearance;

  if (!settingsDocuments || !appearance) {
    return settingsDocuments;
  }

  return {
    ...settingsDocuments,
    domains: {
      ...settingsDocuments.domains,
      appearance: {
        ...appearance,
        effective: {
          ...appearance.effective,
          chat: {
            ...getChatAppearanceFromSettingsDocuments(settingsDocuments),
            ...patch,
          },
        },
      },
    },
  };
};

export const getNpcTypeColorsFromSettingsDocuments = (
  settingsDocuments: SettingsDocumentsResponseDtoOutput | undefined,
) => {
  const appearance = settingsDocuments?.domains.appearance;

  const npcColors = isRecord(appearance?.effective)
    ? appearance.effective.npcColors
    : undefined;

  return normalizeNpcTypeColors(npcColors ?? DEFAULT_NPC_TYPE_COLORS);
};

export const updateNpcTypeColorsInSettingsDocuments = (
  settingsDocuments: SettingsDocumentsResponseDtoOutput | undefined,
  patch: Partial<NpcTypeColors>,
) => {
  const appearance = settingsDocuments?.domains.appearance;

  if (!settingsDocuments || !appearance) return settingsDocuments;

  return {
    ...settingsDocuments,
    domains: {
      ...settingsDocuments.domains,
      appearance: {
        ...appearance,
        effective: {
          ...appearance.effective,
          npcColors: {
            ...getNpcTypeColorsFromSettingsDocuments(settingsDocuments),
            ...patch,
          },
        },
      },
    },
  };
};

export const useNpcTypeColors = () => {
  const query = useAppearanceSettingsDocuments();

  return {
    ...query,
    npcTypeColors: getNpcTypeColorsFromSettingsDocuments(query.data),
  };
};

const appearanceParams: SettingsDocumentsControllerGetPreferencesParams = {
  domains: "appearance",
};

export const useAppearanceSettingsDocuments = () => {
  const query = useSettingsDocumentsControllerGetPreferences(appearanceParams, {
    query: {
      queryKey:
        getSettingsDocumentsControllerGetPreferencesQueryKey(appearanceParams),
      staleTime: 60_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
    },
  });

  return {
    ...query,
    params: appearanceParams,
    chatAppearance: getChatAppearanceFromSettingsDocuments(query.data),
  };
};

export const getHiddenNpcTypesFromSettingsDocuments = (
  settingsDocuments: SettingsDocumentsResponseDtoOutput | undefined,
): NpcTypeEnum[] => {
  const chat = settingsDocuments?.domains.chat;

  const hidden = isRecord(chat?.effective)
    ? chat.effective.hiddenNpcTypes
    : undefined;

  return Array.isArray(hidden) ? hidden.filter(isNpcType) : [];
};

export const updateHiddenNpcTypesInSettingsDocuments = (
  settingsDocuments: SettingsDocumentsResponseDtoOutput | undefined,
  hiddenNpcTypes: readonly NpcTypeEnum[],
) => {
  const chat = settingsDocuments?.domains.chat;

  if (!settingsDocuments || !chat) return settingsDocuments;

  return {
    ...settingsDocuments,
    domains: {
      ...settingsDocuments.domains,
      chat: {
        ...chat,
        effective: { ...chat.effective, hiddenNpcTypes: [...hiddenNpcTypes] },
      },
    },
  };
};

const chatParams: SettingsDocumentsControllerGetPreferencesParams = {
  domains: "chat",
};

export const useChatSettingsDocuments = () => {
  const query = useSettingsDocumentsControllerGetPreferences(chatParams, {
    query: {
      queryKey:
        getSettingsDocumentsControllerGetPreferencesQueryKey(chatParams),
      staleTime: 60_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
    },
  });

  return {
    ...query,
    params: chatParams,
    hiddenNpcTypes: getHiddenNpcTypesFromSettingsDocuments(query.data),
  };
};
