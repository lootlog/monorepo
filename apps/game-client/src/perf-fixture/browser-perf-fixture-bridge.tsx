import { AppErrorBoundaryFallback } from "@/features/error-boundary/app-error-boundary-fallback";
import { MessageType } from "@/api/chat.api";
import { NpcType } from "@/api/npcs.api";
import type { Timer } from "@/api/timers.api";
import { createEventModeQueryKey } from "@/features/event-mode/use-event-mode-query";
import { useNotificationPresenter } from "@/features/notifications/hooks/use-notification-presenter";
import { queryKeys } from "@/features/public-api/query-keys";
import { getChatControllerGetChatMessagesQueryKey } from "@/lib/api/generated/main/chat/chat";
import { getSoundSettingsControllerGetSettingsQueryKey } from "@/lib/api/generated/main/sound-settings/sound-settings";
import { getMembersControllerGetGuildMembersSummaryQueryKey } from "@/lib/api/generated/main/members/members";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
} from "@/lib/api/generated/main/users/users";
import type {
  ChatMessageResponseDtoOutput,
  SoundSettingsResponseDto,
  UserGameAccountPreferencesResponseDtoOutput,
} from "@/lib/api/generated/main/model";
import { Game } from "@/lib/game";
import { getUserGameAccountPreferencesQueryKey } from "@/lib/game-account-preferences";
import { queryClient } from "@/lib/query-client";
import {
  type NotificationPresentation,
  useNotificationsStore,
} from "@/store/notifications.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useSettingsStore } from "@/store/settings.store";
import { useTimersStore } from "@/store/timers.store";
import {
  type WindowId,
  type WindowOpacity,
  useWindowsStore,
} from "@/store/windows.store";
import {
  CHAT_MESSAGE_LIMIT,
  defaultAirTagPreferences,
  defaultDetectorSettings,
  defaultMapPingPreferences,
  defaultNotificationsSettings,
} from "@lootlog/types";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type BrowserPerformanceEntry = {
  duration: number;
  startTime: number;
};

export type BrowserPerfInstrumentation = {
  audioInstances: number;
  audioPlays: number;
  bodyObserverCallbacks: number;
  longAnimationFrames: BrowserPerformanceEntry[];
  longTasks: BrowserPerformanceEntry[];
  mutationObserverCallbacks: number;
  reactCommits: number;
  storageWrites: number;
};

export type BrowserPerfConfiguration = {
  animationEffectsEnabled: boolean;
  autoHideSeconds: 0 | 30;
  soundEnabled: boolean;
};

export type BrowserPerfPresentation = {
  count: number;
  guildId?: string;
  idPrefix: string;
  mergeNotificationId?: string;
  playSound: boolean;
  via?: "presenter" | "socket";
};

export type BrowserPerfVisualConfiguration = {
  locked: boolean;
  notificationCount?: number;
  opacity: WindowOpacity;
  theme: "dark" | "light";
  windowId: WindowId;
};

export type BrowserPerfVisualResult = {
  blocker?: string;
  rendered: boolean;
  windowId: WindowId;
};

export type BrowserPerfSnapshot = BrowserPerfInstrumentation & {
  autoHideDeadlineCount: number;
  domNodeCount: number;
  domNotificationCount: number;
  domNotificationIds: string[];
  notificationIds: string[];
  notificationServersById: Record<string, string[]>;
  scrollClientHeight: number;
  scrollHeight: number;
  scrollTop: number;
  storeNotificationCount: number;
};

export type BrowserPerfMeasurement = BrowserPerfSnapshot & {
  audioInstancesDelta: number;
  audioPlaysDelta: number;
  bodyObserverCallbacksDelta: number;
  commitAtMs: number;
  doubleAnimationFrameAtMs: number;
  longAnimationFramesDuringMeasurement: BrowserPerformanceEntry[];
  longTasksDuringMeasurement: BrowserPerformanceEntry[];
  mutationObserverCallbacksDelta: number;
  reactCommits: number;
  receiveAtMs: number;
  receiveToCommitMs: number;
  receiveToDoubleAnimationFrameMs: number;
  receiveToPaintMs: number;
  receiveToStoreMs: number;
  storageWritesDelta: number;
  storeAtMs: number;
  storePublications: number;
  synchronousReactCommits: number;
};

export type BrowserPerfFixtureApi = {
  appendVisualChatMessage: (
    guildId: string,
    options?: {
      messageLength?: "long" | "short";
      waitForFrames?: number;
    },
  ) => Promise<void>;
  configure: (configuration: BrowserPerfConfiguration) => Promise<void>;
  prepareVisualWindow: (
    configuration: BrowserPerfVisualConfiguration,
  ) => Promise<BrowserPerfVisualResult>;
  present: (
    presentation: BrowserPerfPresentation,
  ) => Promise<BrowserPerfMeasurement>;
  reset: () => Promise<void>;
  scrollToBottom: () => number;
  snapshot: () => BrowserPerfSnapshot;
  waitForAnimationFrames: (count?: number) => Promise<void>;
  waitForNotificationsToSettle: () => Promise<BrowserPerfSnapshot>;
};

const VISUAL_WINDOW_IDS: readonly WindowId[] = [
  "app-error",
  "settings",
  "timers",
  "chat",
  "command",
  "online-players",
  "add-timer",
  "npc-detector",
  "notifications",
  "create-notification",
  "quick-access",
  "timer-settings-conflict",
  "catching-whitelist-warning",
  "backend-preferences-warning",
  "party-finder",
  "create-party-gathering",
  "event-mode",
];

const createVisualNotificationPresentations = (
  requestedCount = 4,
): NotificationPresentation[] => {
  const createdAt = new Date().toISOString();

  const notificationTypes: NotificationPresentation[] = [
    {
      notification: {
        createdAt,
        discordId: "visual-sender-message",
        guildId: "guild-1",
        message: "Golden message notification",
        notificationId: "visual-message",
        servers: ["guild-1"],
        world: "fixture",
      },
    },
    {
      notification: {
        createdAt,
        discordId: "visual-sender-mention",
        guildId: "guild-1",
        message: "@FixtureHero Golden chat mention",
        notificationId: "visual-mention",
        servers: ["guild-1"],
        type: "chat-mention",
        world: "fixture",
      },
    },
    {
      notification: {
        character: {
          accountId: "visual-party-account",
          characterId: "visual-party-character",
          icon: "fixture-hero.gif",
          lvl: 145,
          nick: "GoldenParty",
          prof: "w",
        },
        createdAt,
        description: "Golden party gathering",
        discordId: "visual-sender-party",
        guildId: "guild-1",
        maxLvl: 200,
        minLvl: 100,
        notificationId: "visual-party",
        servers: ["guild-1"],
        type: "party-gathering",
        world: "fixture",
      },
    },
    {
      notification: {
        createdAt,
        discordId: "visual-sender-npc",
        guildId: "guild-1",
        notificationId: "visual-npc",
        npc: {
          icon: "visual-titan.gif",
          id: 9_001,
          location: "Golden map",
          lvl: 300,
          name: "Golden Titan",
          nick: "Golden Titan",
          prof: "w",
          tpl: 9_001,
          type: 3,
          wt: 80,
          x: 8,
          y: 9,
        } as never,
        servers: ["guild-1"],
        world: "fixture",
      },
    },
  ];
  const additionalMessages = Array.from(
    { length: Math.max(0, requestedCount - notificationTypes.length) },
    (_value, index): NotificationPresentation => ({
      notification: {
        createdAt,
        discordId: `visual-sender-extra-${index}`,
        guildId: "guild-1",
        message: `Golden scroll notification ${index + 1}`,
        notificationId: `visual-extra-${index}`,
        servers: ["guild-1"],
        world: "fixture",
      },
    }),
  );

  return [...notificationTypes, ...additionalMessages];
};

declare global {
  interface Window {
    __lootlogBrowserPerf?: BrowserPerfFixtureApi;
    __lootlogPerfInstrumentation?: BrowserPerfInstrumentation;
    __lootlogPerfSocket?: {
      serverEmit: (event: string, payload: unknown) => void;
    };
  }
}

type PendingMeasurement = {
  beforeInstrumentation: BrowserPerfInstrumentation;
  markPrefix: string;
  receiveAtMs: number;
  reject: (error: Error) => void;
  resolve: (measurement: BrowserPerfMeasurement) => void;
  storeAtMs: number;
  storePublications: number;
  synchronousReactCommits: number;
  timeoutId: number;
  unsubscribe: () => void;
};

const EMPTY_INSTRUMENTATION: BrowserPerfInstrumentation = {
  audioInstances: 0,
  audioPlays: 0,
  bodyObserverCallbacks: 0,
  longAnimationFrames: [],
  longTasks: [],
  mutationObserverCallbacks: 0,
  reactCommits: 0,
  storageWrites: 0,
};

const getInstrumentation = (): BrowserPerfInstrumentation => {
  const instrumentation = window.__lootlogPerfInstrumentation;

  if (!instrumentation) {
    return { ...EMPTY_INSTRUMENTATION };
  }

  return {
    ...instrumentation,
    longAnimationFrames: [...instrumentation.longAnimationFrames],
    longTasks: [...instrumentation.longTasks],
  };
};

const getNotificationElements = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      "#lootlog-root [data-lootlog-notification-id]",
    ),
  );

const getNotificationViewport = (): HTMLElement | null => {
  const notification = getNotificationElements()[0];
  return (
    notification?.closest<HTMLElement>("[data-radix-scroll-area-viewport]") ??
    null
  );
};

const getSnapshot = (): BrowserPerfSnapshot => {
  const notificationElements = getNotificationElements();
  const instrumentation = getInstrumentation();
  const notificationsState = useNotificationsStore.getState();
  const notifications = notificationsState.notifications;
  const notificationViewport = getNotificationViewport();

  return {
    ...instrumentation,
    autoHideDeadlineCount: Object.keys(
      notificationsState.notificationAutoHideByListKey,
    ).length,
    domNodeCount: document.querySelectorAll("#lootlog-root *").length,
    domNotificationCount: notificationElements.length,
    domNotificationIds: notificationElements.map(
      (element) => element.dataset.lootlogNotificationId ?? "",
    ),
    notificationIds: notifications.map(
      (notification) => notification.notificationId,
    ),
    notificationServersById: Object.fromEntries(
      notifications.map((notification) => [
        notification.notificationId,
        [...notification.servers],
      ]),
    ),
    scrollClientHeight: notificationViewport?.clientHeight ?? 0,
    scrollHeight: notificationViewport?.scrollHeight ?? 0,
    scrollTop: notificationViewport?.scrollTop ?? 0,
    storeNotificationCount: notifications.length,
  };
};

const waitForRemainingAnimationFrames = (
  remainingFrames: number,
): Promise<void> => {
  if (remainingFrames <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve(waitForRemainingAnimationFrames(remainingFrames - 1));
    });
  });
};

const waitForAnimationFrames = (count = 2): Promise<void> =>
  waitForRemainingAnimationFrames(Math.max(1, Math.floor(count)));

const waitForPaintBoundary = () =>
  new Promise<{ doubleAnimationFrameAtMs: number; paintAtMs: number }>(
    (resolve) => {
      requestAnimationFrame(() => {
        const paintAtMs = performance.now();
        requestAnimationFrame(() => {
          const doubleAnimationFrameAtMs = performance.now();
          resolve({ doubleAnimationFrameAtMs, paintAtMs });
        });
      });
    },
  );

const cloneNotificationSettings = (
  configuration: BrowserPerfConfiguration,
): UserGameAccountPreferencesResponseDtoOutput["notifications"] => {
  const notifications = Object.fromEntries(
    Object.entries(defaultNotificationsSettings).map(([key, settings]) => [
      key,
      {
        ...settings,
        guildIds: ["guild-1", "guild-2"],
      },
    ]),
  ) as unknown as UserGameAccountPreferencesResponseDtoOutput["notifications"];

  notifications.message = {
    ...notifications.message,
    autoHideTimeout: configuration.autoHideSeconds,
    guildIds: ["guild-1", "guild-2"],
    ignoreOtherWorlds: false,
    show: true,
    sound: configuration.soundEnabled,
  };

  return notifications;
};

const configureQueryData = (configuration: BrowserPerfConfiguration) => {
  const accountId = Game.getAccountId() ?? "fixture-account";
  const timestamp = new Date().toISOString();
  const preferences: UserGameAccountPreferencesResponseDtoOutput = {
    accountId,
    notifications: cloneNotificationSettings(configuration),
    detector:
      defaultDetectorSettings as unknown as UserGameAccountPreferencesResponseDtoOutput["detector"],
    pings:
      defaultMapPingPreferences as UserGameAccountPreferencesResponseDtoOutput["pings"],
    airTags:
      defaultAirTagPreferences as UserGameAccountPreferencesResponseDtoOutput["airTags"],
    hasStoredNotifications: true,
    hasStoredDetector: true,
    hasStoredPings: true,
    hasStoredAirTags: true,
    hasStoredPreferences: true,
  };
  const sounds: SoundSettingsResponseDto = {
    userId: "fixture-user",
    masterVolume: 1,
    notificationsVolume: 1,
    detectorVolume: 0,
    timersVolume: 0,
    pingsVolume: 0,
    notificationsConfig: {},
    detectorConfig: {},
    timersConfig: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  queryClient.setQueryData(
    getUserGameAccountPreferencesQueryKey(accountId),
    preferences,
  );
  queryClient.setQueryData(
    getSoundSettingsControllerGetSettingsQueryKey(),
    sounds,
  );
  queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [
      {
        id: "guild-1",
        name: "Fixture Guild",
        icon: null,
        vanityUrl: null,
        ownerId: "fixture-user",
        publicStatsCardEnabled: true,
        hasLootlogAccess: true,
        isAccessDataStale: false,
      },
      {
        id: "guild-2",
        name: "Second Fixture Guild",
        icon: null,
        vanityUrl: null,
        ownerId: "fixture-user",
        publicStatsCardEnabled: true,
        hasLootlogAccess: true,
        isAccessDataStale: false,
      },
    ],
  );
  queryClient.setQueryData(getUsersControllerGetUserPreferencesQueryKey(), {
    userId: "fixture-user",
    guildsOrder: ["guild-1", "guild-2"],
    theme: "dark",
    colorMode: "dark",
    mutes: { players: [], npcs: [] },
  });
  for (const guildId of ["guild-1", "guild-2"]) {
    queryClient.setQueryData(
      getMembersControllerGetGuildMembersSummaryQueryKey({ guildId }),
      [],
    );
  }
  useSettingsStore.setState({
    animationEffectsEnabled: configuration.animationEffectsEnabled,
  });
};

const seedVisualNpcDetector = () => {
  useNpcDetectorStore.getState().addNpc([
    {
      icon: "visual-titan.gif",
      id: 9_001,
      location: "Golden map",
      lvl: 300,
      nick: "Golden Titan",
      notificationSent: false,
      prof: "w",
      tpl: 9_001,
      type: 3,
      wt: 80,
      x: 8,
      y: 9,
    } as never,
    {
      icon: "visual-hero.gif",
      id: 9_002,
      location: "Golden map",
      lvl: 145,
      nick: "Golden Hero",
      notificationSent: true,
      prof: "m",
      tpl: 9_002,
      type: 3,
      wt: 100,
      x: 10,
      y: 11,
    } as never,
  ]);
};

const createVisualChatMessages = (
  guildId: string,
  count: number,
): ChatMessageResponseDtoOutput[] => {
  const latestTimestampMs = Date.now();

  return Array.from({ length: count }, (_, index) => ({
    canDelete: false,
    canEdit: false,
    characterData: {
      acc: 7_000 + index,
      icon: "visual-chat-character.gif",
      id: 8_000 + index,
      lvl: 120 + (index % 30),
      nick: `FixtureHero${index % 7}`,
      prof: "w",
    },
    guildId,
    id: `${guildId}-visual-message-${index}`,
    message:
      index % 6 === 0
        ? `Variable-height fixture message ${index}: ${"long content ".repeat(8)}`
        : `Fixture message ${index}`,
    senderId: `${guildId}-sender-${index % 7}`,
    timestamp: new Date(
      latestTimestampMs - (count - index) * 1_000,
    ).toISOString(),
    type: MessageType.NORMAL,
  }));
};

const seedVisualChat = () => {
  queryClient.setQueryData(
    getChatControllerGetChatMessagesQueryKey({ guildId: "guild-1" }),
    createVisualChatMessages("guild-1", 120),
  );
  queryClient.setQueryData(
    getChatControllerGetChatMessagesQueryKey({ guildId: "guild-2" }),
    createVisualChatMessages("guild-2", CHAT_MESSAGE_LIMIT - 3),
  );
};

const seedVisualTimers = () => {
  const characterId = String(Game.hero.id);
  const world = Game.getWorldName();
  const nowMs = Date.now();
  const timers: Timer[] = [
    {
      guildId: "guild-1",
      maxSpawnTime: new Date(nowMs + 65_000).toISOString(),
      minSpawnTime: new Date(nowMs + 35_000).toISOString(),
      npc: {
        icon: "visual-timer.gif",
        id: 9_101,
        location: "Golden map",
        lvl: 155,
        margonemType: 4,
        name: "Golden Timer",
        prof: "w",
        type: NpcType.HERO,
        wt: 75,
      },
      npcId: 9_101,
      timerKey: "visual-golden-timer",
      updatedAt: new Date(nowMs).toISOString(),
      wasReset: false,
      world,
    },
    {
      guildId: "guild-2",
      maxSpawnTime: new Date(nowMs + 95_000).toISOString(),
      minSpawnTime: new Date(nowMs + 45_000).toISOString(),
      npc: {
        icon: "visual-timer-second.gif",
        id: 9_102,
        location: "Second golden map",
        lvl: 180,
        margonemType: 4,
        name: "Second Golden Timer",
        prof: "m",
        type: NpcType.TITAN,
        wt: 90,
      },
      npcId: 9_102,
      timerKey: "visual-second-golden-timer",
      updatedAt: new Date(nowMs).toISOString(),
      wasReset: false,
      world,
    },
  ];

  queryClient.setQueryData(queryKeys.timers(world), timers);
  useSettingsStore.setState((state) => ({
    guildIdByCharId: {
      ...state.guildIdByCharId,
      [characterId]: "guild-1",
    },
  }));
  useTimersStore.setState({
    customColors: {
      "visual-custom": {
        backgroundColor: "#123456",
        borderColor: "#abcdef",
        id: "visual-custom",
        name: "Visual custom",
      },
    },
    timersColors: {
      "Golden Timer": "visual-custom",
    },
  });
};

const seedVisualPartyFinder = () => {
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  const timestamp = new Date().toISOString();
  usePartyFinderStore.getState().mergeProjection({
    schemaVersion: 3,
    notificationId: "visual-ready-room",
    organizerDiscordId: "fixture-discord",
    organizerCharacter: {
      accountId: String(Game.hero.account),
      characterId: String(Game.hero.id),
      icon: "fixture-hero.gif",
      lvl: Game.hero.lvl,
      nick: Game.hero.nick,
      prof: Game.hero.prof,
    },
    guildIds: ["guild-1"],
    world: "fixture",
    status: "ACTIVE",
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt,
    viewer: "ORGANIZER",
    ownedParticipantIds: ["visual-participant"],
    participants: {
      "visual-participant": {
        participantId: "visual-participant",
        discordId: "visual-participant-discord",
        character: {
          accountId: "visual-participant-account",
          characterId: "visual-participant-character",
          icon: "visual-participant.gif",
          lvl: 140,
          nick: "GoldenParticipant",
          prof: "m",
        },
        partyPresence: "OUTSIDE",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    },
  });
};

const seedVisualEventMode = () => {
  const normalizedWorld = Game.getWorldName().trim().toLowerCase();
  queryClient.setQueryData(
    createEventModeQueryKey({
      authenticatedLootlogUserId: "fixture-user",
      margonemAccountId: Game.getAccountId() ?? "",
      normalizedWorld,
    }),
    {
      events: [
        {
          id: "visual-event",
          name: "Golden Hunt",
          world: normalizedWorld,
          guild: { id: "guild-1", name: "Fixture Guild" },
          assignments: [
            {
              eventMapId: "visual-map",
              heroId: "visual-hero",
              npcId: 9_003,
              npcName: "Golden Hero",
              npcIcon: null,
              margonemMapId: Number(Game.map.id),
              mapName: Game.map.name,
            },
          ],
          nextRespawn: {
            heroId: "visual-hero",
            npcId: 9_003,
            npcName: "Golden Hero",
            minSpawnTime: new Date(Date.now() - 30 * 60_000).toISOString(),
            maxSpawnTime: new Date(Date.now() + 30 * 60_000).toISOString(),
            status: "OPEN",
          },
        },
      ],
    },
  );
};

const setVisualTheme = (theme: BrowserPerfVisualConfiguration["theme"]) => {
  const root = document.getElementById("lootlog-root");
  if (!root) {
    return;
  }

  root.classList.remove("dark-theme", "light");
  root.classList.add(theme === "dark" ? "dark-theme" : "light");
};

const getEntriesDuringMeasurement = (
  entries: readonly BrowserPerformanceEntry[],
  receiveAtMs: number,
  paintAtMs: number,
) =>
  entries.filter(
    (entry) => entry.startTime >= receiveAtMs && entry.startTime <= paintAtMs,
  );

const waitForNotificationsToSettle = (
  deadlineMs = performance.now() + 5_000,
): Promise<BrowserPerfSnapshot> => {
  const snapshot = getSnapshot();
  if (snapshot.domNotificationCount === snapshot.storeNotificationCount) {
    return Promise.resolve(snapshot);
  }

  if (performance.now() >= deadlineMs) {
    return Promise.reject(
      new Error(
        `Notification DOM did not settle at ${snapshot.storeNotificationCount} rows`,
      ),
    );
  }

  return new Promise<BrowserPerfSnapshot>((resolve, reject) => {
    requestAnimationFrame(() => {
      void waitForNotificationsToSettle(deadlineMs).then(resolve, reject);
    });
  });
};

export const BrowserPerfFixtureBridge = () => {
  const { presentNotifications } = useNotificationPresenter();
  const [visualFixtureWindowId, setVisualFixtureWindowId] =
    useState<WindowId | null>(null);
  const animationCycle = useNotificationsStore(
    (state) => state.latestNotificationAnimationCycle,
  );
  const presentNotificationsRef = useRef(presentNotifications);
  const pendingMeasurementsRef = useRef(new Map<number, PendingMeasurement>());
  presentNotificationsRef.current = presentNotifications;

  useLayoutEffect(() => {
    const pendingMeasurement =
      pendingMeasurementsRef.current.get(animationCycle);

    if (!pendingMeasurement) {
      return;
    }

    pendingMeasurementsRef.current.delete(animationCycle);
    window.clearTimeout(pendingMeasurement.timeoutId);
    pendingMeasurement.unsubscribe();
    const commitAtMs = performance.now();
    const commitsBeforeCurrentLayoutEffect =
      getInstrumentation().reactCommits -
      pendingMeasurement.beforeInstrumentation.reactCommits;
    pendingMeasurement.synchronousReactCommits =
      commitsBeforeCurrentLayoutEffect + 1;
    performance.mark(`${pendingMeasurement.markPrefix}:commit`, {
      startTime: commitAtMs,
    });

    void waitForPaintBoundary().then(
      ({ doubleAnimationFrameAtMs, paintAtMs }) => {
        performance.mark(`${pendingMeasurement.markPrefix}:paint-opportunity`, {
          startTime: paintAtMs,
        });
        performance.mark(`${pendingMeasurement.markPrefix}:double-rAF`, {
          startTime: doubleAnimationFrameAtMs,
        });
        performance.measure(
          `${pendingMeasurement.markPrefix}:receive-to-paint`,
          {
            end: `${pendingMeasurement.markPrefix}:paint-opportunity`,
            start: `${pendingMeasurement.markPrefix}:receive`,
          },
        );
        performance.measure(
          `${pendingMeasurement.markPrefix}:receive-to-double-rAF`,
          {
            end: `${pendingMeasurement.markPrefix}:double-rAF`,
            start: `${pendingMeasurement.markPrefix}:receive`,
          },
        );
        const snapshot = getSnapshot();
        const afterInstrumentation = getInstrumentation();

        pendingMeasurement.resolve({
          ...snapshot,
          audioInstancesDelta:
            afterInstrumentation.audioInstances -
            pendingMeasurement.beforeInstrumentation.audioInstances,
          audioPlaysDelta:
            afterInstrumentation.audioPlays -
            pendingMeasurement.beforeInstrumentation.audioPlays,
          bodyObserverCallbacksDelta:
            afterInstrumentation.bodyObserverCallbacks -
            pendingMeasurement.beforeInstrumentation.bodyObserverCallbacks,
          commitAtMs,
          doubleAnimationFrameAtMs,
          longAnimationFramesDuringMeasurement: getEntriesDuringMeasurement(
            afterInstrumentation.longAnimationFrames,
            pendingMeasurement.receiveAtMs,
            doubleAnimationFrameAtMs,
          ),
          longTasksDuringMeasurement: getEntriesDuringMeasurement(
            afterInstrumentation.longTasks,
            pendingMeasurement.receiveAtMs,
            doubleAnimationFrameAtMs,
          ),
          mutationObserverCallbacksDelta:
            afterInstrumentation.mutationObserverCallbacks -
            pendingMeasurement.beforeInstrumentation.mutationObserverCallbacks,
          reactCommits:
            afterInstrumentation.reactCommits -
            pendingMeasurement.beforeInstrumentation.reactCommits,
          receiveAtMs: pendingMeasurement.receiveAtMs,
          receiveToCommitMs: commitAtMs - pendingMeasurement.receiveAtMs,
          receiveToDoubleAnimationFrameMs:
            doubleAnimationFrameAtMs - pendingMeasurement.receiveAtMs,
          receiveToPaintMs: paintAtMs - pendingMeasurement.receiveAtMs,
          receiveToStoreMs:
            pendingMeasurement.storeAtMs - pendingMeasurement.receiveAtMs,
          storageWritesDelta:
            afterInstrumentation.storageWrites -
            pendingMeasurement.beforeInstrumentation.storageWrites,
          storeAtMs: pendingMeasurement.storeAtMs,
          storePublications: pendingMeasurement.storePublications,
          synchronousReactCommits: pendingMeasurement.synchronousReactCommits,
        });
      },
    );
  });

  useEffect(() => {
    const pendingMeasurements = pendingMeasurementsRef.current;
    const api: BrowserPerfFixtureApi = {
      appendVisualChatMessage: async (guildId, options) => {
        const queryKey = getChatControllerGetChatMessagesQueryKey({ guildId });
        queryClient.setQueryData<ChatMessageResponseDtoOutput[]>(
          queryKey,
          (messages = []) => {
            const nextIndex = messages.length;
            return [
              ...messages,
              {
                canDelete: false,
                canEdit: false,
                characterData: {
                  acc: 90_000 + nextIndex,
                  icon: "visual-chat-character.gif",
                  id: 91_000 + nextIndex,
                  lvl: 200,
                  nick: "FixtureIncoming",
                  prof: "w",
                },
                guildId,
                id: `${guildId}-incoming-${nextIndex}`,
                message:
                  options?.messageLength === "long"
                    ? `Incoming fixture message ${nextIndex} ${"with variable height content ".repeat(12)}`
                    : `Incoming fixture message ${nextIndex}`,
                senderId: `${guildId}-incoming-sender`,
                timestamp: new Date(Date.now() + nextIndex).toISOString(),
                type: MessageType.NORMAL,
              },
            ].slice(-CHAT_MESSAGE_LIMIT);
          },
        );
        await waitForAnimationFrames(options?.waitForFrames ?? 20);
      },
      configure: async (configuration) => {
        configureQueryData(configuration);
        await waitForAnimationFrames();
      },
      prepareVisualWindow: async (configuration) => {
        setVisualFixtureWindowId(null);
        for (const windowId of VISUAL_WINDOW_IDS) {
          useWindowsStore.getState().setOpen(windowId, false);
        }
        useNotificationsStore.getState().clearNotifications();
        useNpcDetectorStore.getState().clearNpcs();
        usePartyFinderStore.getState().clearReadyRooms();
        await waitForAnimationFrames(4);

        configureQueryData({
          animationEffectsEnabled: false,
          autoHideSeconds: 0,
          soundEnabled: false,
        });
        setVisualTheme(configuration.theme);

        if (configuration.windowId === "notifications") {
          useNotificationsStore
            .getState()
            .presentNotifications(
              createVisualNotificationPresentations(
                configuration.notificationCount,
              ),
            );
        } else if (configuration.windowId === "npc-detector") {
          seedVisualNpcDetector();
        } else if (configuration.windowId === "chat") {
          seedVisualChat();
        } else if (configuration.windowId === "timers") {
          seedVisualTimers();
        } else if (configuration.windowId === "party-finder") {
          seedVisualPartyFinder();
        } else if (
          configuration.windowId === "event-mode" ||
          configuration.windowId === "quick-access"
        ) {
          seedVisualEventMode();
        }

        const windowsStore = useWindowsStore.getState();
        windowsStore.setPosition(configuration.windowId, { x: 64, y: 64 });
        windowsStore.setOpacity(configuration.windowId, configuration.opacity);
        windowsStore.setLocked(configuration.windowId, configuration.locked);
        windowsStore.setOpen(configuration.windowId, true);

        if (configuration.windowId === "app-error") {
          setVisualFixtureWindowId(configuration.windowId);
        }

        await waitForAnimationFrames(8);
        const selector = `[data-ll-draggable-window="${configuration.windowId}"]`;
        const rendered = document.querySelector(selector) !== null;
        let blocker: string | undefined;
        if (configuration.windowId === "create-notification") {
          blocker =
            "The create-notification state ID has no production renderer.";
        } else if (!rendered) {
          blocker = `The ${configuration.windowId} production window did not render from fixture state.`;
        }

        return {
          blocker,
          rendered,
          windowId: configuration.windowId,
        };
      },
      present: (presentation) => {
        const receiveAtMs = performance.now();
        const expectedAnimationCycle =
          useNotificationsStore.getState().latestNotificationAnimationCycle + 1;

        return new Promise<BrowserPerfMeasurement>((resolve, reject) => {
          const markPrefix = `lootlog-notification-${expectedAnimationCycle}`;
          performance.mark(`${markPrefix}:receive`, { startTime: receiveAtMs });
          const pendingMeasurement: PendingMeasurement = {
            beforeInstrumentation: getInstrumentation(),
            markPrefix,
            receiveAtMs,
            reject,
            resolve,
            storeAtMs: receiveAtMs,
            storePublications: 0,
            synchronousReactCommits: 0,
            timeoutId: 0,
            unsubscribe: () => undefined,
          };
          pendingMeasurement.unsubscribe = useNotificationsStore.subscribe(
            () => {
              if (pendingMeasurement.storePublications === 0) {
                pendingMeasurement.storeAtMs = performance.now();
                performance.mark(`${markPrefix}:store`, {
                  startTime: pendingMeasurement.storeAtMs,
                });
              }
              pendingMeasurement.storePublications += 1;
            },
          );
          pendingMeasurement.timeoutId = window.setTimeout(() => {
            pendingMeasurements.delete(expectedAnimationCycle);
            pendingMeasurement.unsubscribe();
            pendingMeasurement.reject(
              new Error(
                `Notification presentation did not reach animation cycle ${expectedAnimationCycle}`,
              ),
            );
          }, 5_000);
          pendingMeasurements.set(expectedAnimationCycle, pendingMeasurement);

          const requests = Array.from(
            { length: Math.max(0, Math.floor(presentation.count)) },
            (_, index) => {
              const guildId = presentation.guildId ?? "guild-1";
              const notificationId =
                presentation.mergeNotificationId ??
                `${presentation.idPrefix}-${index}`;

              return {
                notification: {
                  notificationId,
                  discordId: `fixture-sender-${index}`,
                  guildId,
                  world: "fixture",
                  createdAt: new Date(Date.now() + index).toISOString(),
                  message: `${presentation.idPrefix} message ${index}`,
                  servers: [guildId],
                },
                playSound: presentation.playSound,
              };
            },
          );

          try {
            if (presentation.via === "socket") {
              const fixtureSocket = window.__lootlogPerfSocket;
              if (!fixtureSocket) {
                throw new Error("Browser performance socket is unavailable");
              }

              for (const request of requests) {
                const { servers: _, ...socketNotification } =
                  request.notification;
                fixtureSocket.serverEmit(
                  "notifications-send",
                  socketNotification,
                );
              }
            } else {
              presentNotificationsRef.current(requests);
            }
          } catch (error) {
            pendingMeasurements.delete(expectedAnimationCycle);
            window.clearTimeout(pendingMeasurement.timeoutId);
            pendingMeasurement.unsubscribe();
            throw error;
          }
        });
      },
      reset: async () => {
        useNotificationsStore.getState().clearNotifications();
        useWindowsStore.getState().setOpen("notifications", false);
        await waitForAnimationFrames();
      },
      scrollToBottom: () => {
        const viewport = getNotificationViewport();
        if (!viewport) {
          return 0;
        }

        viewport.scrollTop = viewport.scrollHeight;
        return viewport.scrollTop;
      },
      snapshot: getSnapshot,
      waitForAnimationFrames,
      waitForNotificationsToSettle,
    };

    window.__lootlogBrowserPerf = api;

    return () => {
      if (window.__lootlogBrowserPerf === api) {
        delete window.__lootlogBrowserPerf;
      }

      for (const pendingMeasurement of pendingMeasurements.values()) {
        window.clearTimeout(pendingMeasurement.timeoutId);
        pendingMeasurement.unsubscribe();
        pendingMeasurement.reject(
          new Error("Browser performance fixture was disposed"),
        );
      }
      pendingMeasurements.clear();
    };
  }, []);

  if (visualFixtureWindowId === "app-error") {
    return (
      <AppErrorBoundaryFallback
        error={new Error("Golden fixture error")}
        resetErrorBoundary={() => setVisualFixtureWindowId(null)}
      />
    );
  }

  return null;
};
