import {
  getCharacterAurasControllerGetOwnAuraQueryKey,
  type OwnCharacterAuraResponseDto,
} from "@lootlog/client/main";
import { queryClient } from "@/lib/query-client";
import type { SettingsDomainManifestItem } from "./settings-manifest-types";

export const CORE_SETTINGS_DOMAINS = [
  {
    id: "general",
    labelKey: "settings.domains.general",
    icon: "settings",
    subsections: [
      {
        id: "behavior",
        labelKey: "settings.subsections.behavior",
        controls: [
          {
            id: "account-status",
            labelKey: "settings.general.accountLabel",
            descriptionKey: "settings.general.statusTitle",
            aliases: ["konto", "sesja", "logowanie", "discord", "cookies"],
          },
          {
            id: "connection-status",
            labelKey: "settings.general.connectionLabel",
            descriptionKey: "settings.general.statusTitle",
            aliases: ["połączenie", "realtime", "websocket", "gateway"],
          },
          {
            id: "allow-world-selection",
            labelKey: "settings.general.allowWorldSelectionLabel",
            descriptionKey: "settings.general.allowWorldSelectionDescription",
            settingKeys: ["general.allowWorldSelection"],
          },
          {
            id: "animation-effects",
            labelKey: "settings.general.animationEffectsLabel",
            descriptionKey: "settings.general.animationEffectsDescription",
            aliases: ["animacje", "wydajność", "performance"],
            settingKeys: ["device.animationEffectsEnabled"],
          },
          {
            id: "map-auras",
            labelKey: "settings.general.mapAurasLabel",
            descriptionKey: "settings.general.mapAurasDescription",
            aliases: ["aury", "aura", "wydajność", "akceleracja", "lagi"],
            settingKeys: ["device.mapAuras"],
          },
          {
            id: "mobile-ui-mode",
            labelKey: "settings.general.mobileUiModeLabel",
            descriptionKey: "settings.general.mobileUiModeDescription",
            aliases: ["telefon", "mobilny", "mobile", "dotyk", "interfejs"],
            settingKeys: ["device.mobileUiMode"],
          },
          {
            id: "loot-split-window",
            labelKey: "lootSplit.settings.windowLabel",
            descriptionKey: "lootSplit.settings.windowDescription",
            aliases: ["podział", "łupy", "loot", "okno"],
            settingKeys: ["gameData.lootSplit"],
          },
          {
            id: "loot-split-rarities",
            labelKey: "lootSplit.settings.raritiesLabel",
            descriptionKey: "lootSplit.settings.raritiesDescription",
            aliases: [
              "podział",
              "łupy",
              "rzadkość",
              "legendarny",
              "heroiczny",
              "unikatowy",
            ],
            settingKeys: ["gameData.lootSplit"],
          },
          {
            id: "reset-window-layout",
            labelKey: "settings.general.resetWindowLayoutLabel",
            descriptionKey: "settings.general.resetWindowLayoutDescription",
            aliases: ["okna", "położenie", "pozycja", "rozmiar", "reset"],
          },
          {
            id: "clear-local-data",
            labelKey: "settings.general.clearLocalDataLabel",
            descriptionKey: "settings.general.clearLocalDataDescription",
            aliases: ["cache", "pamięć", "storage", "wyczyść", "reset"],
          },
        ],
      },
    ],
  },
  {
    id: "catching",
    labelKey: "settings.domains.catching",
    icon: "crosshair",
    subsections: [
      {
        id: "catching",
        labelKey: "settings.subsections.catching",
        controls: [
          {
            id: "catching-range",
            labelKey: "settings.catching.form.collectionRangeTitle",
            aliases: ["łupy", "lootlog", "organizacje", "zbieranie"],
            settingKeys: ["gameData.lootlog"],
          },
        ],
      },
    ],
  },
  {
    id: "servers",
    labelKey: "settings.domains.servers",
    icon: "server",
    subsections: [
      {
        id: "visibility",
        labelKey: "settings.subsections.serverVisibility",
        controls: [
          {
            id: "server-visibility",
            labelKey: "settings.servers.title",
            descriptionKey: "settings.servers.description",
            aliases: ["serwery", "discord", "ukryte serwery"],
          },
        ],
      },
    ],
  },
  {
    id: "appearance",
    labelKey: "settings.domains.appearance",
    icon: "palette",
    subsections: [
      {
        id: "npc-colors",
        labelKey: "settings.subsections.npcColors",
        controls: [
          {
            id: "npc-type-colors",
            labelKey: "settings.npcColors.title",
            descriptionKey: "settings.npcColors.description",
            aliases: [
              "kolory potworów",
              "kolory npc",
              "elita",
              "heros",
              "kolos",
              "tytan",
              "tropiciel",
            ],
            settingKeys: [
              "appearance.npcColors.ELITE",
              "appearance.npcColors.ELITE2",
              "appearance.npcColors.ELITE3",
              "appearance.npcColors.HERO",
              "appearance.npcColors.EVENT_HERO",
              "appearance.npcColors.COLOSSUS",
              "appearance.npcColors.TITAN",
              "appearance.npcColors.HERO_TRACKER",
            ],
          },
        ],
      },
      {
        id: "character-aura",
        labelKey: "settings.subsections.characterAura",
        visible: () => {
          const own = queryClient.getQueryData<OwnCharacterAuraResponseDto>(
            getCharacterAurasControllerGetOwnAuraQueryKey(),
          );

          return Boolean(own?.canChange || own?.auras.length);
        },
        controls: [
          {
            id: "character-aura",
            labelKey: "settings.characterAura.title",
            descriptionKey: "settings.characterAura.description",
            aliases: ["aura", "efekt postaci", "wygląd postaci"],
          },
        ],
      },
    ],
  },
  {
    id: "chat",
    labelKey: "settings.domains.chat",
    icon: "messageSquare",
    subsections: [
      {
        id: "chat-appearance",
        labelKey: "settings.subsections.chatAppearance",
        controls: [
          {
            id: "chat-preset",
            labelKey: "settings.chat.preset.label",
            aliases: ["czytelny", "kompaktowy"],
            settingKeys: [
              "appearance.chat.npcLayout",
              "appearance.chat.fontScalePercent",
              "appearance.chat.messageGapPx",
              "appearance.chat.showTimestamp",
              "appearance.chat.showGuildLabel",
              "appearance.chat.showNpcAvatar",
              "appearance.chat.showNpcLevel",
              "appearance.chat.showNpcLocationAndCoordinates",
            ],
          },
          {
            id: "chat-npc-layout",
            labelKey: "settings.chat.npcLayout.label",
            descriptionKey: "settings.chat.npcLayout.description",
            settingKeys: ["appearance.chat.npcLayout"],
            help: {
              recommendationKey: "settings.chat.npcLayout.recommendation",
              exampleKey: "settings.chat.npcLayout.example",
            },
          },
          {
            id: "chat-font-scale",
            labelKey: "settings.chat.fontScale.label",
            aliases: ["rozmiar tekstu", "czcionka"],
            settingKeys: ["appearance.chat.fontScalePercent"],
          },
          {
            id: "chat-message-gap",
            labelKey: "settings.chat.messageGap.label",
            aliases: ["odstęp", "gap", "margines"],
            settingKeys: ["appearance.chat.messageGapPx"],
          },
          {
            id: "chat-metadata",
            labelKey: "settings.chat.metadata.title",
            aliases: [
              "avatar",
              "lootlog",
              "gildia",
              "poziom",
              "lokacja",
              "koordynaty",
            ],
            settingKeys: [
              "appearance.chat.showTimestamp",
              "appearance.chat.showGuildLabel",
              "appearance.chat.showNpcAvatar",
              "appearance.chat.showNpcLevel",
              "appearance.chat.showNpcLocationAndCoordinates",
            ],
          },
        ],
      },
      {
        id: "chat-filters",
        labelKey: "settings.subsections.chatFilters",
        controls: [
          {
            id: "chat-npc-message-types",
            labelKey: "settings.chatFilters.npcMessages.title",
            descriptionKey: "settings.chatFilters.npcMessages.description",
            aliases: [
              "ukryj",
              "wyłącz",
              "elita",
              "heros",
              "kolos",
              "tytan",
              "filtr",
            ],
            settingKeys: ["chat.hiddenNpcTypes"],
          },
        ],
      },
    ],
  },
] as const satisfies readonly SettingsDomainManifestItem[];
