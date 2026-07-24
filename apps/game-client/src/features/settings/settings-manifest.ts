import type {
  SettingsDomainValue,
  SettingsSubsectionValue,
} from "./constants/settings-tabs";
import type { SettingsCatalogKey } from "@lootlog/types";

export type SettingsIconName =
  | "settings"
  | "palette"
  | "clock"
  | "database"
  | "bell"
  | "keyboard"
  | "activity"
  | "info";

export interface SettingsControlManifestItem {
  id: string;
  labelKey: string;
  descriptionKey?: string;
  aliases?: string[];
  settingKeys?: SettingsCatalogKey[];
  help?: {
    recommendationKey?: string;
    exampleKey?: string;
    dependencyKey?: string;
  };
}

export interface SettingsSubsectionManifestItem {
  id: SettingsSubsectionValue;
  labelKey: string;
  controls: SettingsControlManifestItem[];
  visible?: () => boolean;
}

export interface SettingsDomainManifestItem {
  id: SettingsDomainValue;
  labelKey: string;
  icon: SettingsIconName;
  subsections: SettingsSubsectionManifestItem[];
}

export const SETTINGS_MANIFEST: SettingsDomainManifestItem[] = [
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
            help: {
              recommendationKey: "settings.help.animationsRecommendation",
            },
          },
          {
            id: "map-pings",
            labelKey: "settings.general.mapPingsLabel",
            descriptionKey: "settings.general.mapPingsDescription",
            settingKeys: ["gameData.pings"],
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
        id: "chat",
        labelKey: "settings.subsections.chat",
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
              "appearance.chat.showNpcLocation",
              "appearance.chat.showNpcCoordinates",
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
            aliases: ["avatar", "gildia", "poziom", "lokacja", "koordynaty"],
            settingKeys: [
              "appearance.chat.showTimestamp",
              "appearance.chat.showGuildLabel",
              "appearance.chat.showNpcAvatar",
              "appearance.chat.showNpcLevel",
              "appearance.chat.showNpcLocation",
              "appearance.chat.showNpcCoordinates",
            ],
          },
        ],
      },
      {
        id: "timer-appearance",
        labelKey: "settings.subsections.timerAppearance",
        controls: [
          {
            id: "timer-visibility",
            labelKey: "settings.timers.appearance.visibilityTitle",
            settingKeys: ["appearance.timers.displayConfig"],
          },
          {
            id: "timer-layout",
            labelKey: "settings.timers.appearance.layoutTitle",
            settingKeys: ["appearance.timers.displayConfig"],
          },
          {
            id: "timer-scale",
            labelKey: "settings.timers.appearance.scaleTitle",
            settingKeys: ["appearance.timers.displayConfig"],
          },
        ],
      },
      {
        id: "timer-colors",
        labelKey: "settings.subsections.timerColors",
        controls: [
          {
            id: "timer-colors-list",
            labelKey: "settings.timers.colors.listTitle",
            aliases: ["barwy", "kolor timera"],
            settingKeys: [
              "appearance.timers.customColors",
              "appearance.timers.timersColors",
              "appearance.timers.defaultColorNames",
              "appearance.timers.overriddenDefaultColors",
              "appearance.timers.hiddenDefaultColors",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "timers",
    labelKey: "settings.domains.timers",
    icon: "clock",
    subsections: [
      {
        id: "timer-behavior",
        labelKey: "settings.subsections.timerBehavior",
        controls: [
          {
            id: "timer-behavior",
            labelKey: "settings.timers.general.behaviorTitle",
            settingKeys: [
              "timers.generalConfig",
              "timers.timerFiltersEnabled",
              "timers.colorFiltersEnabled",
              "timers.timersSortOrder",
              "timers.syncEnabled",
            ],
          },
          {
            id: "timer-countdown",
            labelKey: "settings.timers.general.countdownTitle",
            settingKeys: ["timers.alwaysVisibleExpiredTimers"],
          },
        ],
      },
      {
        id: "hidden-timers",
        labelKey: "settings.tabs.hiddenTimers",
        controls: [
          {
            id: "hidden-timers-list",
            labelKey: "settings.hiddenTimers.listTitle",
            settingKeys: ["timers.hiddenTimers", "timers.pinnedTimers"],
          },
        ],
      },
    ],
  },
  {
    id: "game-data",
    labelKey: "settings.domains.gameData",
    icon: "database",
    subsections: [
      {
        id: "catching",
        labelKey: "settings.tabs.catching",
        controls: [
          {
            id: "catching-range",
            labelKey: "settings.catching.form.collectionRangeTitle",
            settingKeys: ["gameData.lootlog"],
          },
        ],
      },
      {
        id: "detector",
        labelKey: "settings.tabs.detector",
        controls: [
          {
            id: "detector-routing",
            labelKey: "settings.detector.routing.sectionTitle",
            aliases: ["discord", "serwery"],
            settingKeys: ["gameData.detector"],
          },
        ],
      },
      {
        id: "battle-panel",
        labelKey: "settings.tabs.battlePanel",
        controls: [
          {
            id: "battle-data-collection",
            labelKey: "settings.battlePanel.dataCollectionTitle",
            settingKeys: ["gameData.battlePanel"],
          },
        ],
      },
    ],
  },
  {
    id: "notifications",
    labelKey: "settings.domains.notifications",
    icon: "bell",
    subsections: [
      {
        id: "notification-rules",
        labelKey: "settings.tabs.notifications",
        controls: [
          {
            id: "notification-rules",
            labelKey: "settings.notifications.title",
          },
        ],
      },
      {
        id: "notification-mutes",
        labelKey: "settings.tabs.notificationMutes",
        controls: [
          {
            id: "notification-mutes",
            labelKey: "settings.notificationMutes.title",
            settingKeys: ["notifications.mutes"],
          },
        ],
      },
      {
        id: "sounds",
        labelKey: "settings.tabs.sounds",
        controls: [
          {
            id: "sound-master-volume",
            labelKey: "settings.sounds.masterVolume",
            settingKeys: ["device.masterVolume", "device.soundsMuted"],
          },
        ],
      },
    ],
  },
  {
    id: "controls",
    labelKey: "settings.domains.controls",
    icon: "keyboard",
    subsections: [
      {
        id: "hotkeys",
        labelKey: "settings.tabs.hotkeys",
        controls: [
          {
            id: "hotkeys",
            labelKey: "settings.hotkeys.title",
            settingKeys: ["controls.hotkeys"],
          },
        ],
      },
    ],
  },
  {
    id: "diagnostics",
    labelKey: "settings.domains.diagnostics",
    icon: "activity",
    subsections: [
      {
        id: "logs",
        labelKey: "settings.tabs.logs",
        controls: [
          {
            id: "logs-filters",
            labelKey: "settings.logs.filtersTitle",
          },
        ],
      },
      {
        id: "debug",
        labelKey: "settings.tabs.debug",
        controls: [],
        visible: () => import.meta.env.DEV,
      },
    ],
  },
  {
    id: "information",
    labelKey: "settings.domains.information",
    icon: "info",
    subsections: [
      {
        id: "build",
        labelKey: "settings.information.buildDetailsTitle",
        controls: [
          {
            id: "build-information",
            labelKey: "settings.information.title",
          },
        ],
      },
    ],
  },
];
