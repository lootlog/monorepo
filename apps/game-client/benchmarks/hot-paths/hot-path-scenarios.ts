import type { GameEvent } from "@lootlog/margonem/game-events";
import type { GameNpc } from "@lootlog/margonem/npcs";
import type { Other } from "@lootlog/margonem/others";
import type { ChatMessageResponseDtoOutput } from "@/lib/api/generated/main/model";
import type { Timer } from "@/api/timers.api";
import { MessageType } from "@/api/chat.api";
import {
  getChatRenderableMessages,
  getCurrentChatMessages,
} from "@/features/chat/chat.helpers";
import {
  applyPresenceUpdates,
  type PlayerPresence,
  type PlayerPresenceResponse,
} from "@/lib/online-players-presence";
import {
  calculateTimeLeft,
  filterTimersByColor,
  filterTimersByExpiredVisibility,
  filterTimersByLevel,
  filterTimersByNpcType,
  filterTimersByRemovalTime,
  filterTimersBySearchText,
  filterTimersByVisibility,
  mergeTimers,
  sortTimersByPinnedAndTime,
} from "@/features/timers/utils/timers-utils";
import { gameEventsManager } from "@/lib/game-events-manager";
import { FriendsProcessor } from "@/processors/friends-processor";
import { NpcsDeleteProcessor } from "@/processors/npcs-delete-processor";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useFriendsStore } from "@/store/friends.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import {
  useNotificationsStore,
  type NotificationPresentation,
} from "@/store/notifications.store";
import { useOthersStore } from "@/store/others.store";
import type {
  BenchmarkAssertionResult,
  BenchmarkKind,
} from "./benchmark-report";
import type { BenchmarkScenario } from "./benchmark-runner";

const FIXED_TIMESTAMP_MS = Date.UTC(2026, 6, 20, 12, 0, 0);
const STORE_ITEM_COUNT = 5_000;
const STORE_BATCH_COUNT = 500;
const BATTLE_EVENT_COUNT = 10_000;
const MANAGER_EVENT_COUNT = 1_000;
const CHAT_GUILD_COUNT = 4;
const CHAT_MESSAGES_PER_GUILD = 300;
const NOTIFICATION_BATCH_COUNT = 100;
const PRESENCE_ACCOUNT_COUNT = 5_000;
const PRESENCE_UPDATE_COUNT = 500;
const FRIEND_COUNT = 5_000;

const exactAssertion = (
  name: string,
  actual: number,
  expected: number,
): BenchmarkAssertionResult => ({
  actual,
  expected,
  name,
  operator: "===",
  passed: actual === expected,
});

const createOther = (id: number): Other =>
  ({
    id,
    nick: `Player ${id}`,
    x: id % 32,
    y: id % 24,
  }) as unknown as Other;

const initialOthers = Object.fromEntries(
  Array.from({ length: STORE_ITEM_COUNT }, (_, index) => [
    String(index),
    createOther(index),
  ]),
);
const otherUpserts = Object.fromEntries(
  Array.from({ length: STORE_BATCH_COUNT }, (_, offset) => {
    const id = STORE_ITEM_COUNT / 2 + offset;
    return [String(id), createOther(id + STORE_ITEM_COUNT)];
  }),
);
const otherRemovalIds = Array.from({ length: STORE_BATCH_COUNT }, (_, index) =>
  String(index),
);

const createNpc = (
  id: number,
): GameNpc & {
  location: string;
  notificationSent: boolean;
} =>
  ({
    hpp: 100,
    icon: `npc-${id}.gif`,
    id,
    location: `Map ${id % 25}`,
    lvl: (id % 300) + 1,
    name: `NPC ${id}`,
    notificationSent: false,
    prof: "w",
    type: 2,
    wt: 20,
    x: id % 32,
    y: id % 24,
  }) as unknown as GameNpc & {
    location: string;
    notificationSent: boolean;
  };

const npcs = Array.from({ length: STORE_ITEM_COUNT }, (_, index) =>
  createNpc(index),
);
const npcRemovalIds = Array.from(
  { length: STORE_ITEM_COUNT / 2 },
  (_, index) => index * 2,
);
const npcDetectionAnimations = Object.fromEntries(
  npcs.map((npc) => [npc.id, 1]),
);
const npcDeletionEvent = {
  npcs_del: npcRemovalIds.map((id) => ({ id })),
} as unknown as GameEvent;
const npcDeletionNotifications = npcRemovalIds.slice(0, 50).map(
  (npcId, index) =>
    ({
      guildId: "guild-1",
      listKey: `npc-notification-${index}`,
      notificationId: `npc-notification-${index}`,
      npc: { id: npcId },
      receivedAtMs: FIXED_TIMESTAMP_MS + index,
      servers: ["guild-1"],
      world: "world-1",
    }) as never,
);

const timers = Array.from({ length: STORE_ITEM_COUNT }, (_, index) => {
  const spawnOffsetMs = index * 1_000;
  return {
    createdAt: new Date(FIXED_TIMESTAMP_MS - 60_000).toISOString(),
    deletedAt: null,
    guildId: `guild-${index % 10}`,
    id: `timer-${index}`,
    maxSpawnTime: new Date(
      FIXED_TIMESTAMP_MS + 300_000 + spawnOffsetMs,
    ).toISOString(),
    minSpawnTime: new Date(
      FIXED_TIMESTAMP_MS + 60_000 + spawnOffsetMs,
    ).toISOString(),
    npc: {
      icon: `npc-${index}.gif`,
      id: index,
      lvl: (index % 300) + 1,
      margonemType: 2,
      name: `Timer NPC ${index}`,
      prof: "w",
      type: "ELITE2",
      wt: 20,
    },
    npcId: index,
    timerKey: `timer-${index}`,
    updatedAt: new Date(FIXED_TIMESTAMP_MS).toISOString(),
    world: `world-${index % 3}`,
  } as unknown as Timer;
});
const timerNpcTypes = ["ELITE2"];

const chatMessageCache = Object.fromEntries(
  Array.from({ length: CHAT_GUILD_COUNT }, (_, guildIndex) => {
    const guildId = `guild-${guildIndex}`;
    const messages = Array.from(
      { length: CHAT_MESSAGES_PER_GUILD },
      (_, messageIndex) => {
        const globalIndex = guildIndex * CHAT_MESSAGES_PER_GUILD + messageIndex;
        return {
          characterData: {
            id: `character-${globalIndex}`,
            lvl: (globalIndex % 300) + 1,
            name: `Character ${globalIndex}`,
            prof: "w",
          },
          createdAt: new Date(FIXED_TIMESTAMP_MS + globalIndex).toISOString(),
          guildId,
          id: `message-${globalIndex}`,
          message: `Message ${globalIndex}`,
          senderId: `sender-${globalIndex % 100}`,
          timestamp: new Date(FIXED_TIMESTAMP_MS + globalIndex).toISOString(),
          type: MessageType.NORMAL,
        } as unknown as ChatMessageResponseDtoOutput;
      },
    );

    return [guildId, messages];
  }),
);

const notificationPresentations: NotificationPresentation[] = Array.from(
  { length: NOTIFICATION_BATCH_COUNT },
  (_, index) => ({
    autoHideDurationMs: 30_000,
    notification: {
      createdAt: new Date(FIXED_TIMESTAMP_MS + index).toISOString(),
      discordId: `discord-${index}`,
      guildId: `guild-${index % 10}`,
      message: `Mention ${index}`,
      notificationId: `notification-${index}`,
      servers: [`server-${index % 3}`],
      type: "chat-mention",
      world: `world-${index % 3}`,
    },
  }),
);

const createPresence = (index: number, mapName: string): PlayerPresence => ({
  discordId: `discord-${index}`,
  guildId: "guild-1",
  isAfk: false,
  mapName,
  platform: "game",
  status: "online",
  updatedAt: FIXED_TIMESTAMP_MS + index,
  player: {
    accountId: `account-${index}`,
    characterId: `character-${index}`,
    icon: `character-${index}.gif`,
    lvl: (index % 300) + 1,
    name: `Player ${index}`,
    prof: "w",
    world: "world-1",
  },
});

const initialPresenceResponse: PlayerPresenceResponse = Object.fromEntries(
  Array.from({ length: PRESENCE_ACCOUNT_COUNT }, (_, index) => [
    `discord-${index}`,
    [createPresence(index, `Map ${index % 25}`)],
  ]),
);
const presenceUpdates = Array.from(
  { length: PRESENCE_UPDATE_COUNT },
  (_, offset) => {
    const index = PRESENCE_ACCOUNT_COUNT / 2 + offset;
    return createPresence(index, `Updated map ${offset % 25}`);
  },
);

const friendsEventPayload = Array.from({ length: FRIEND_COUNT }, (_, index) => [
  String(index),
  `Friend ${index}`,
  `friend-${index}.gif`,
  String((index % 300) + 1),
  "0",
  "w",
  `Map ${index % 25}`,
  String(index % 32),
  String(index % 24),
  "online",
  "metadata",
]).flat();

const battleEvents = Array.from(
  { length: BATTLE_EVENT_COUNT },
  (_, index) =>
    ({
      f: {
        m: [`turn-${index}`],
      },
    }) as unknown as GameEvent,
);

const managerEvents = Array.from(
  { length: MANAGER_EVENT_COUNT },
  (_, index) => ({ other: { [index]: { id: index } } }) as unknown as GameEvent,
);

const createScenario = (
  name: string,
  group: string,
  kind: BenchmarkKind,
  prepare: BenchmarkScenario["prepare"],
  options: Pick<BenchmarkScenario, "hardP95LimitMs"> = {},
): BenchmarkScenario => ({ group, kind, name, prepare, ...options });

const createOthersBatchScenario = (): BenchmarkScenario =>
  createScenario("others.apply-batch-500-of-5000", "store", "micro", () => {
    useOthersStore.setState({ othersById: initialOthers });
    let publications = 0;
    const unsubscribe = useOthersStore.subscribe(() => {
      publications += 1;
    });
    let retainedOthers = useOthersStore.getState().othersById;

    return {
      cleanup: () => {
        unsubscribe();
        useOthersStore.setState({ othersById: {} });
      },
      observe: () => ({
        assertions: [
          exactAssertion("store publications", publications, 1),
          exactAssertion(
            "retained others",
            Object.keys(retainedOthers).length,
            STORE_ITEM_COUNT - STORE_BATCH_COUNT,
          ),
        ],
        retainedValue: retainedOthers,
      }),
      run: () => {
        useOthersStore.getState().applyBatch({
          removeIds: otherRemovalIds,
          upserts: otherUpserts,
        });
        retainedOthers = useOthersStore.getState().othersById;
      },
    };
  });

const createNpcAddScenario = (): BenchmarkScenario =>
  createScenario("npc.add-5000", "npc", "e2e", () => {
    useNpcDetectorStore.setState({
      activeDetectionAnimations: {},
      latestDetectionAnimationCycle: 0,
      npcs: [],
    });
    let publications = 0;
    const unsubscribe = useNpcDetectorStore.subscribe(() => {
      publications += 1;
    });
    let retainedNpcs = useNpcDetectorStore.getState().npcs;

    return {
      cleanup: () => {
        unsubscribe();
        useNpcDetectorStore.setState({
          activeDetectionAnimations: {},
          latestDetectionAnimationCycle: 0,
          npcs: [],
        });
      },
      observe: () => ({
        assertions: [
          exactAssertion("store publications", publications, 1),
          exactAssertion("retained NPCs", retainedNpcs.length, npcs.length),
        ],
        retainedValue: retainedNpcs,
      }),
      run: () => {
        useNpcDetectorStore.getState().addNpc(npcs);
        retainedNpcs = useNpcDetectorStore.getState().npcs;
      },
    };
  });

const createFriendsProcessorScenario = (): BenchmarkScenario =>
  createScenario("processor.friends-5000", "processors", "e2e", () => {
    useFriendsStore.setState({ friends: [], friendsMax: 0 });
    const processor = new FriendsProcessor();
    let publications = 0;
    const unsubscribe = useFriendsStore.subscribe(() => {
      publications += 1;
    });
    let retainedState = useFriendsStore.getState();

    return {
      cleanup: () => {
        unsubscribe();
        useFriendsStore.setState({ friends: [], friendsMax: 0 });
      },
      observe: () => ({
        assertions: [
          exactAssertion("store publications", publications, 1),
          exactAssertion(
            "parsed friends",
            retainedState.friends.length,
            FRIEND_COUNT,
          ),
          exactAssertion("friends max", retainedState.friendsMax, FRIEND_COUNT),
        ],
        retainedValue: retainedState.friends,
      }),
      run: () => {
        processor.handle({
          friends: friendsEventPayload,
          friends_max: FRIEND_COUNT,
        });
        retainedState = useFriendsStore.getState();
      },
    };
  });

const createNpcRemoveScenario = (): BenchmarkScenario =>
  createScenario("npc.remove-2500-of-5000", "npc", "e2e", () => {
    useNpcDetectorStore.setState({
      activeDetectionAnimations: npcDetectionAnimations,
      latestDetectionAnimationCycle: 1,
      npcs,
    });
    let publications = 0;
    const unsubscribe = useNpcDetectorStore.subscribe(() => {
      publications += 1;
    });
    let retainedNpcs = useNpcDetectorStore.getState().npcs;

    return {
      cleanup: () => {
        unsubscribe();
        useNpcDetectorStore.setState({
          activeDetectionAnimations: {},
          latestDetectionAnimationCycle: 0,
          npcs: [],
        });
      },
      observe: () => ({
        assertions: [
          exactAssertion("store publications", publications, 1),
          exactAssertion(
            "retained NPCs",
            retainedNpcs.length,
            STORE_ITEM_COUNT - npcRemovalIds.length,
          ),
        ],
        retainedValue: retainedNpcs,
      }),
      run: () => {
        useNpcDetectorStore.getState().removeNpc(npcRemovalIds);
        retainedNpcs = useNpcDetectorStore.getState().npcs;
      },
    };
  });

const createTimersPipelineScenario = (): BenchmarkScenario =>
  createScenario("timers.pipeline-5000", "timers", "e2e", () => {
    const originalDateNow = Date.now;
    Date.now = () => FIXED_TIMESTAMP_MS;
    let retainedTimers: ReturnType<typeof calculateTimeLeft> = [];

    return {
      cleanup: () => {
        Date.now = originalDateNow;
      },
      observe: () => ({
        assertions: [
          exactAssertion(
            "retained timers",
            retainedTimers.length,
            timers.length,
          ),
        ],
        retainedValue: retainedTimers,
      }),
      run: () => {
        const mergedTimers = mergeTimers(timers);
        const timersWithTimeLeft = calculateTimeLeft(mergedTimers);
        retainedTimers = sortTimersByPinnedAndTime(
          filterTimersByColor(
            filterTimersByLevel(
              filterTimersByNpcType(
                filterTimersBySearchText(
                  filterTimersByVisibility(
                    filterTimersByExpiredVisibility(
                      filterTimersByRemovalTime(timersWithTimeLeft, 30_000),
                      30_000,
                      {},
                    ),
                    [],
                    false,
                  ),
                  "timer npc",
                ),
                timerNpcTypes,
              ),
              0,
              300,
            ),
            [],
            {},
          ),
          [],
          "asc",
        );
      },
    };
  });

const createChatPipelineScenario = (): BenchmarkScenario =>
  createScenario("chat.pipeline-1200", "chat", "e2e", () => {
    let messages: ReturnType<typeof getCurrentChatMessages> = [];
    let renderables: ReturnType<typeof getChatRenderableMessages> = [];

    return {
      observe: () => ({
        assertions: [
          exactAssertion(
            "retained messages",
            messages.length,
            CHAT_GUILD_COUNT * CHAT_MESSAGES_PER_GUILD,
          ),
          exactAssertion(
            "renderables",
            renderables.length,
            CHAT_GUILD_COUNT * CHAT_MESSAGES_PER_GUILD + 1,
          ),
        ],
        retainedValue: { messages, renderables },
      }),
      run: () => {
        messages = getCurrentChatMessages(chatMessageCache, "all", "all");
        renderables = getChatRenderableMessages(messages);
      },
    };
  });

const createNotificationBatchScenario = (): BenchmarkScenario =>
  createScenario(
    "notifications.present-100-cap-50",
    "notifications",
    "e2e",
    () => {
      const originalDateNow = Date.now;
      Date.now = () => FIXED_TIMESTAMP_MS;
      useNotificationsStore.setState({
        latestNotificationAnimationCycle: 0,
        notificationAutoHideByListKey: {},
        notifications: [],
      });
      let publications = 0;
      const unsubscribe = useNotificationsStore.subscribe(() => {
        publications += 1;
      });
      let retainedState = useNotificationsStore.getState();

      return {
        cleanup: () => {
          unsubscribe();
          Date.now = originalDateNow;
          useNotificationsStore.setState({
            latestNotificationAnimationCycle: 0,
            notificationAutoHideByListKey: {},
            notifications: [],
          });
        },
        observe: () => {
          const newestNotificationIndex = Number(
            retainedState.notifications[0]?.notificationId.split("-").at(-1),
          );
          const oldestNotificationIndex = Number(
            retainedState.notifications
              .at(-1)
              ?.notificationId.split("-")
              .at(-1),
          );

          return {
            assertions: [
              exactAssertion("store publications", publications, 1),
              exactAssertion(
                "retained notifications",
                retainedState.notifications.length,
                50,
              ),
              exactAssertion(
                "auto-hide deadlines",
                Object.keys(retainedState.notificationAutoHideByListKey).length,
                50,
              ),
              exactAssertion(
                "newest notification",
                newestNotificationIndex,
                99,
              ),
              exactAssertion(
                "oldest notification",
                oldestNotificationIndex,
                50,
              ),
            ],
            retainedValue: {
              notificationAutoHideByListKey:
                retainedState.notificationAutoHideByListKey,
              notifications: retainedState.notifications,
            },
          };
        },
        run: () => {
          useNotificationsStore
            .getState()
            .presentNotifications(notificationPresentations);
          retainedState = useNotificationsStore.getState();
        },
      };
    },
  );

const createPresenceBatchScenario = (): BenchmarkScenario =>
  createScenario("presence.apply-500-of-5000", "presence", "e2e", () => {
    let nextPresence = initialPresenceResponse;

    return {
      observe: () => {
        const firstUpdatedAccountIndex = PRESENCE_ACCOUNT_COUNT / 2;
        const untouchedAccount = initialPresenceResponse["discord-0"];

        return {
          assertions: [
            exactAssertion(
              "retained accounts",
              Object.keys(nextPresence).length,
              PRESENCE_ACCOUNT_COUNT,
            ),
            exactAssertion(
              "top-level structural update",
              Number(nextPresence !== initialPresenceResponse),
              1,
            ),
            exactAssertion(
              "untouched account reference",
              Number(nextPresence["discord-0"] === untouchedAccount),
              1,
            ),
            exactAssertion(
              "updated accounts",
              presenceUpdates.filter((presence) => {
                return (
                  nextPresence[presence.discordId]?.[0]?.mapName ===
                  presence.mapName
                );
              }).length,
              PRESENCE_UPDATE_COUNT,
            ),
            exactAssertion(
              "first updated account",
              Number(
                nextPresence[`discord-${firstUpdatedAccountIndex}`]?.[0]
                  ?.mapName === "Updated map 0",
              ),
              1,
            ),
          ],
          retainedValue: nextPresence,
        };
      },
      run: () => {
        nextPresence = applyPresenceUpdates(
          initialPresenceResponse,
          presenceUpdates,
        );
      },
    };
  });

const createBattleAccumulationScenario = (): BenchmarkScenario =>
  createScenario("battle.accumulate-10000", "battle", "e2e", () => {
    useBattleStore.getState().clearEvents();
    useBattleStore.setState({
      battleState: "in-battle",
      battleWarriors: {},
      lastBattleHash: "",
      lastKillHash: "",
    });
    let publications = 0;
    const unsubscribe = useBattleStore.subscribe(() => {
      publications += 1;
    });
    let retainedEvents = useBattleStore.getState().events;

    return {
      cleanup: () => {
        unsubscribe();
        useBattleStore.getState().clearEvents();
      },
      observe: () => ({
        assertions: [
          exactAssertion("store publications", publications, 0),
          exactAssertion(
            "retained battle events",
            retainedEvents.length,
            BATTLE_EVENT_COUNT,
          ),
        ],
        retainedValue: retainedEvents,
      }),
      run: () => {
        const addEvent = useBattleStore.getState().addEvent;
        for (const event of battleEvents) {
          addEvent(event);
        }
        retainedEvents = useBattleStore.getState().events;
      },
    };
  });

const createManagerQueueDrainScenario = (): BenchmarkScenario =>
  createScenario(
    "manager.queue-drain-1000",
    "events",
    "e2e",
    () => {
      gameEventsManager.cleanup();
      let queuedEvents = 0;
      for (const event of managerEvents) {
        queuedEvents += Number(gameEventsManager.queueEvent(event));
      }
      gameEventsManager.setReady(true);
      let processedEvents = 0;

      return {
        cleanup: () => {
          gameEventsManager.cleanup();
        },
        observe: () => ({
          assertions: [
            exactAssertion(
              "accepted queued events",
              queuedEvents,
              MANAGER_EVENT_COUNT,
            ),
            exactAssertion(
              "processed queued events",
              processedEvents,
              MANAGER_EVENT_COUNT,
            ),
          ],
        }),
        run: () => {
          gameEventsManager.setProcessor(() => {
            processedEvents += 1;
          });
        },
      };
    },
    { hardP95LimitMs: 8 },
  );

type SuccessDataWindow = Window & {
  Engine: {
    communication: {
      successData: (...args: unknown[]) => unknown;
    };
  };
  successData: (...args: unknown[]) => unknown;
};

const restoreProperty = (
  target: object,
  property: PropertyKey,
  descriptor: PropertyDescriptor | undefined,
): void => {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor);
    return;
  }

  Reflect.deleteProperty(target, property);
};

const createNpcDeleteProcessorScenario = (): BenchmarkScenario =>
  createScenario(
    "processor.npc-delete-2500-of-5000",
    "processors",
    "e2e",
    () => {
      const engineDescriptor = Object.getOwnPropertyDescriptor(
        window,
        "Engine",
      );
      const gameDescriptor = Object.getOwnPropertyDescriptor(window, "g");
      Object.defineProperty(window, "Engine", {
        configurable: true,
        value: undefined,
        writable: true,
      });
      Object.defineProperty(window, "g", {
        configurable: true,
        value: {
          npc: Object.fromEntries(npcs.map((npc) => [npc.id, npc])),
          worldConfig: {
            getWorldName: () => "world-1",
          },
        },
        writable: true,
      });
      useNpcDetectorStore.setState({
        activeDetectionAnimations: npcDetectionAnimations,
        latestDetectionAnimationCycle: 1,
        npcs,
      });
      useNotificationsStore.setState({
        notificationAutoHideByListKey: {},
        notifications: npcDeletionNotifications,
      });
      const processor = new NpcsDeleteProcessor();
      let detectorPublications = 0;
      let notificationPublications = 0;
      const unsubscribeDetector = useNpcDetectorStore.subscribe(() => {
        detectorPublications += 1;
      });
      const unsubscribeNotifications = useNotificationsStore.subscribe(() => {
        notificationPublications += 1;
      });
      let retainedNpcs = useNpcDetectorStore.getState().npcs;
      let retainedNotifications =
        useNotificationsStore.getState().notifications;

      return {
        cleanup: () => {
          unsubscribeDetector();
          unsubscribeNotifications();
          useNpcDetectorStore.setState({
            activeDetectionAnimations: {},
            latestDetectionAnimationCycle: 0,
            npcs: [],
          });
          useNotificationsStore.setState({
            notificationAutoHideByListKey: {},
            notifications: [],
          });
          restoreProperty(window, "Engine", engineDescriptor);
          restoreProperty(window, "g", gameDescriptor);
        },
        observe: () => ({
          assertions: [
            exactAssertion(
              "NPC detector publications",
              detectorPublications,
              1,
            ),
            exactAssertion(
              "notification publications",
              notificationPublications,
              1,
            ),
            exactAssertion(
              "retained NPCs",
              retainedNpcs.length,
              STORE_ITEM_COUNT - npcRemovalIds.length,
            ),
            exactAssertion(
              "retained NPC notifications",
              retainedNotifications.length,
              0,
            ),
          ],
          retainedValue: { retainedNotifications, retainedNpcs },
        }),
        run: () => {
          processor.handle(npcDeletionEvent);
          retainedNpcs = useNpcDetectorStore.getState().npcs;
          retainedNotifications =
            useNotificationsStore.getState().notifications;
        },
      };
    },
  );

const createManagerProxyScenario = (): BenchmarkScenario =>
  createScenario("manager.proxy-object-1000", "events", "e2e", () => {
    gameEventsManager.cleanup();
    const successDataDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "successData",
    );
    const engineDescriptor = Object.getOwnPropertyDescriptor(window, "Engine");
    let originalHandlerCalls = 0;
    const originalHandler = (payload: unknown) => {
      originalHandlerCalls += 1;
      return payload;
    };
    const gameWindow = window as unknown as SuccessDataWindow;
    Object.defineProperty(window, "successData", {
      configurable: true,
      value: originalHandler,
      writable: true,
    });
    Object.defineProperty(window, "Engine", {
      configurable: true,
      value: {
        communication: {
          successData: originalHandler,
        },
      },
      writable: true,
    });

    let processorCalls = 0;
    gameEventsManager.setProcessor(() => {
      processorCalls += 1;
    });
    gameEventsManager.setReady(true);
    let afterHandlerCalls = 0;
    let afterHandlerCallsBeforeUnsubscribe = 0;
    const unsubscribe = gameEventsManager.subscribeAfterGameEvent(() => {
      afterHandlerCalls += 1;
    });
    gameEventsManager.setupProxies();

    return {
      cleanup: () => {
        unsubscribe();
        gameEventsManager.cleanup();
        restoreProperty(window, "successData", successDataDescriptor);
        restoreProperty(window, "Engine", engineDescriptor);
      },
      observe: () => ({
        assertions: [
          exactAssertion(
            "processor calls",
            processorCalls,
            MANAGER_EVENT_COUNT + 1,
          ),
          exactAssertion(
            "game handler calls",
            originalHandlerCalls,
            MANAGER_EVENT_COUNT + 1,
          ),
          exactAssertion(
            "after-listener calls while subscribed",
            afterHandlerCallsBeforeUnsubscribe,
            MANAGER_EVENT_COUNT,
          ),
          exactAssertion(
            "after-listener calls after unsubscribe",
            afterHandlerCalls - afterHandlerCallsBeforeUnsubscribe,
            0,
          ),
        ],
      }),
      run: () => {
        for (const event of managerEvents) {
          gameWindow.successData(event);
        }

        afterHandlerCallsBeforeUnsubscribe = afterHandlerCalls;
        unsubscribe();
        gameWindow.successData(managerEvents[0]);
      },
    };
  });

export const createHotPathScenarios = (): BenchmarkScenario[] => [
  createOthersBatchScenario(),
  createFriendsProcessorScenario(),
  createNpcAddScenario(),
  createNpcRemoveScenario(),
  createNpcDeleteProcessorScenario(),
  createTimersPipelineScenario(),
  createChatPipelineScenario(),
  createNotificationBatchScenario(),
  createPresenceBatchScenario(),
  createBattleAccumulationScenario(),
  createManagerQueueDrainScenario(),
  createManagerProxyScenario(),
];
