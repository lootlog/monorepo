import type { SettingsDomainManifestItem } from "./settings-manifest-types";

export const FEATURE_SETTINGS_DOMAINS = [
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
            aliases: ["grupowanie", "torby", "kompaktowy"],
            settingKeys: [
              "timers.generalConfig",
              "timers.timerFiltersEnabled",
              "timers.colorFiltersEnabled",
              "timers.timersSortOrder",
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
            aliases: ["legacy", "stary wygląd", "wygląd legacy"],
            settingKeys: ["appearance.timers.displayConfig"],
          },
          {
            id: "timer-scale",
            labelKey: "settings.timers.appearance.scaleTitle",
            aliases: ["czcionka", "szerokość"],
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
      {
        id: "timer-lists",
        labelKey: "settings.subsections.timerLists",
        controls: [
          {
            id: "timer-lists",
            labelKey: "settings.timers.lists.title",
            aliases: ["grupy", "zestawy", "filtr", "własne listy"],
            settingKeys: ["timers.customLists"],
          },
        ],
      },
      {
        id: "hidden-timers",
        labelKey: "settings.subsections.hiddenTimers",
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
    id: "notifications",
    labelKey: "settings.domains.notifications",
    icon: "bell",
    subsections: [
      {
        id: "notification-rules",
        labelKey: "settings.subsections.notificationRules",
        controls: [
          {
            id: "notification-rules",
            labelKey: "settings.notifications.title",
            aliases: ["elita", "heros", "kolos", "tytan", "auto ukrywanie"],
            settingKeys: ["notifications.presentation"],
          },
          {
            id: "notification-servers",
            labelKey: "settings.notifications.serversTitle",
            descriptionKey: "settings.notifications.serversDescription",
            aliases: ["serwery", "discord", "gildie"],
            settingKeys: ["notifications.presentation"],
          },
        ],
      },
    ],
  },
  {
    id: "detector",
    labelKey: "settings.domains.detector",
    icon: "radar",
    subsections: [
      {
        id: "detector",
        labelKey: "settings.subsections.detector",
        controls: [
          {
            id: "detector-character-auto-send",
            labelKey: "settings.detector.characterAutoSend.label",
            descriptionKey: "settings.detector.characterAutoSend.description",
            aliases: ["autowysyłka", "autowołanie", "postać", "wykrywacz"],
            settingKeys: ["gameData.detectorAutoSendEnabled"],
          },
          {
            id: "detector-types",
            labelKey: "settings.detector.typesTitle",
            descriptionKey: "settings.detector.description",
            aliases: [
              "wykrywacz",
              "elita",
              "heros",
              "kolos",
              "tytan",
              "tropiciel",
            ],
            settingKeys: ["gameData.detector"],
          },
          {
            id: "detector-routing",
            labelKey: "settings.detector.routing.sectionTitle",
            descriptionKey: "settings.detector.routing.sectionDescription",
            aliases: ["routing", "discord", "serwery", "wykrywacz", "wysyłka"],
            settingKeys: ["gameData.detector"],
          },
        ],
      },
    ],
  },
  {
    id: "mutes",
    labelKey: "settings.domains.mutes",
    icon: "bellOff",
    subsections: [
      {
        id: "muted-players",
        labelKey: "settings.subsections.mutedPlayers",
        controls: [
          {
            id: "muted-players",
            labelKey: "settings.mutes.players",
            aliases: ["wyciszenia", "wycisz", "gracze"],
            settingKeys: ["notifications.mutes"],
          },
        ],
      },
      {
        id: "muted-npcs",
        labelKey: "settings.subsections.mutedNpcs",
        controls: [
          {
            id: "muted-npcs",
            labelKey: "settings.mutes.npcs",
            aliases: ["wyciszenia", "wycisz", "potwory", "npc"],
            settingKeys: ["notifications.mutes"],
          },
        ],
      },
    ],
  },
  {
    id: "battle-panel",
    labelKey: "settings.domains.battlePanel",
    icon: "swords",
    subsections: [
      {
        id: "battle-panel",
        labelKey: "settings.subsections.battleDataCollection",
        controls: [
          {
            id: "battle-data-collection",
            labelKey: "settings.battlePanel.dataCollectionTitle",
            aliases: ["walki", "panel walk"],
            settingKeys: ["gameData.battlePanel"],
          },
        ],
      },
    ],
  },
  {
    id: "pings",
    labelKey: "settings.domains.pings",
    icon: "mapPin",
    subsections: [
      {
        id: "pings",
        labelKey: "settings.subsections.pings",
        controls: [
          {
            id: "map-pings",
            labelKey: "pings.settings.mapLabel",
            descriptionKey: "pings.settings.mapDescription",
            aliases: ["pingi", "mapa", "koło"],
            settingKeys: ["gameData.pings"],
          },
          {
            id: "air-tag-minimap",
            labelKey: "settings.airTags.minimapLabel",
            descriptionKey: "settings.airTags.minimapDescription",
            aliases: ["airtag", "wrogowie", "minimapa", "podręczna mapa"],
            settingKeys: ["gameData.airTags"],
          },
          {
            id: "battle-pings",
            labelKey: "pings.settings.battleLabel",
            descriptionKey: "pings.settings.battleDescription",
            aliases: ["pingi", "walka", "cel", "prośba", "leczenie", "aura"],
            settingKeys: ["gameData.battlePings"],
          },
        ],
      },
    ],
  },
  {
    id: "sounds",
    labelKey: "settings.domains.sounds",
    icon: "volume2",
    subsections: [
      {
        id: "sounds",
        labelKey: "settings.subsections.sounds",
        controls: [
          {
            id: "sound-master-volume",
            labelKey: "settings.sounds.masterTitle",
            descriptionKey: "settings.sounds.masterDescription",
            aliases: ["wycisz", "głośność"],
            settingKeys: ["device.masterVolume", "device.soundsMuted"],
          },
          {
            id: "sound-notifications",
            labelKey: "settings.sounds.categories.notifications.label",
            descriptionKey:
              "settings.sounds.categories.notifications.description",
            aliases: ["głośność", "powiadomienia", "dźwięk"],
            settingKeys: [
              "sounds.notificationsVolume",
              "sounds.notificationsConfig",
            ],
          },
          {
            id: "sound-detector",
            labelKey: "settings.sounds.categories.detector.label",
            descriptionKey: "settings.sounds.categories.detector.description",
            aliases: ["głośność", "wykrywacz", "dźwięk"],
            settingKeys: ["sounds.detectorVolume", "sounds.detectorConfig"],
          },
          {
            id: "sound-timers",
            labelKey: "settings.sounds.categories.timers.label",
            descriptionKey: "settings.sounds.categories.timers.description",
            aliases: ["głośność", "timery", "respawn", "okno", "dźwięk"],
            settingKeys: [
              "sounds.timersVolume",
              "sounds.timersConfig",
              "sounds.timerWindowSoonSound",
              "sounds.timerWindowSoonMinutes",
              "sounds.timerWindowOpenSound",
              "sounds.timerWindowEndSound",
              "sounds.timerSoundNpcNames",
            ],
          },
          {
            id: "sound-pings",
            labelKey: "settings.sounds.categories.pings.label",
            descriptionKey: "settings.sounds.categories.pings.description",
            aliases: ["głośność", "pingi", "mapa", "walka", "prośba"],
            settingKeys: ["sounds.pingsVolume"],
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
        labelKey: "settings.subsections.hotkeys",
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
        labelKey: "settings.subsections.logs",
        controls: [
          {
            id: "loot-debug-logging",
            labelKey: "settings.logs.lootDebugLoggingLabel",
            descriptionKey: "settings.logs.lootDebugLoggingDescription",
            aliases: ["konsola", "debug"],
          },
          {
            id: "logs-list",
            labelKey: "settings.logs.listTitle",
            aliases: ["akcje", "requesty", "api"],
          },
        ],
      },
      {
        id: "debug",
        labelKey: "settings.subsections.debug",
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
        id: "whats-new",
        labelKey: "settings.whatsNew.title",
        controls: [
          {
            id: "whats-new",
            labelKey: "settings.whatsNew.title",
            aliases: ["nowości", "zmiany", "aktualizacje", "changelog"],
          },
        ],
      },
      {
        id: "build",
        labelKey: "settings.information.buildDetailsTitle",
        controls: [
          {
            id: "build-information",
            labelKey: "settings.information.title",
          },
          {
            id: "diagnostics-report",
            labelKey: "settings.information.diagnosticsTitle",
            aliases: ["diagnostyka", "zgłoś błąd", "wsparcie", "błąd"],
          },
        ],
      },
    ],
  },
] as const satisfies readonly SettingsDomainManifestItem[];
