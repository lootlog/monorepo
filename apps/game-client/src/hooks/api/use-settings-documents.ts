import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  useSettingsDocumentsControllerGetPreferences,
} from "@lootlog/api-client/react-query/main/preferences";
import type { SettingsDocumentsControllerGetPreferencesParams } from "@lootlog/api-client/models/main/settings-documents-controller-get-preferences-params";
import type { SettingsDocumentsResponseDtoOutput } from "@lootlog/api-client/models/main/settings-documents-response-dto-output";
import {
  DEFAULT_NPC_TYPE_COLORS,
  normalizeChatAppearanceSettings,
  normalizeNpcTypeColors,
  type ChatAppearanceSettings,
  type NpcTypeColors,
} from "@lootlog/types";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

export const useAppearanceSettingsDocuments = () => {
  const params: SettingsDocumentsControllerGetPreferencesParams = {
    domains: "appearance",
  };
  const query = useSettingsDocumentsControllerGetPreferences(params, {
    query: {
      queryKey: getSettingsDocumentsControllerGetPreferencesQueryKey(params),
      staleTime: 60_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
    },
  });

  return {
    ...query,
    params,
    chatAppearance: getChatAppearanceFromSettingsDocuments(query.data),
  };
};
