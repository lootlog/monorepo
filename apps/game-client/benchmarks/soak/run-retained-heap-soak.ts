import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type { GameNpc } from "@lootlog/margonem/npcs";
import type { Other } from "@lootlog/margonem/others";
import type { AirTagSubscriptionAck, MapPingEvent } from "@lootlog/types";
import type { ChatMessageResponseDtoOutput } from "@/lib/api/generated/main/model";
import { MessageType } from "@/api/chat.api";
import { airTagReceiveController } from "@/features/air-tags/air-tag-receive-controller";
import { airTagRuntime } from "@/features/air-tags/air-tag-runtime";
import { upsertChatMessage } from "@/features/chat/chat.helpers";
import { updateChatMessagesCache } from "@/features/chat/chat-query-cache.helpers";
import { mapPingController } from "@/features/map-pings/map-ping-controller";
import { mapPingInteractionController } from "@/features/map-pings/map-ping-interaction-controller";
import { startLoggedAction } from "@/lib/logs/log-actions";
import { queryClient } from "@/lib/query-client";
import { resetTransientRuntimeState } from "@/lib/runtime-state";
import { getChatControllerGetChatMessagesQueryKey } from "@/lib/api/generated/main/chat/chat";
import { MapChangeProcessor } from "@/processors/map-change-processor";
import { LOGS_BYTE_CAP, LOGS_CAP, useLogsStore } from "@/store/logs.store";
import {
  MAX_BATTLE_CAPTURE_BYTES,
  MAX_BATTLE_CAPTURE_EVENTS,
  useBattleStore,
} from "@/store/game-store/battle.store";
import {
  type NotificationPresentation,
  useNotificationsStore,
} from "@/store/notifications.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useOthersStore } from "@/store/others.store";
import {
  buildSoakMarkdown,
  createSoakReport,
  type SoakReport,
  type SoakStructuralMetrics,
} from "./soak-report";

const LIFECYCLE_MAP_COUNT = 100;
const POST_GC_TREND_SAMPLE_COUNT = 5;
const CHAT_MESSAGE_COUNT = 10_000;
const CHAT_GUILD_COUNT = 10;
const CHAT_MESSAGE_LIMIT_PER_GUILD = 300;
const NOTIFICATION_COUNT = 10_000;
const NOTIFICATION_LIMIT = 50;
const BATTLE_LOG_CAPTURE_COUNT = 200;
const BATTLE_EVENTS_PER_CAPTURE = 12;
const BATTLE_TURN_SIZE = 12 * 1024;
const NOTIFICATION_BATCH_SIZE = 100;
const DEFAULT_OUTPUT_DIRECTORY = "artifacts/retained-heap-soak";
const FIXED_TIMESTAMP_MS = Date.UTC(2026, 6, 20, 12, 0, 0);

const textEncoder = new TextEncoder();

const createDeterministicText = (length: number, seed: number): string => {
  const characters = new Uint16Array(length);
  let state = seed >>> 0;

  for (let index = 0; index < length; index += 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    characters[index] = 97 + (state % 26);
  }

  return String.fromCharCode(...characters);
};

const getPrefixSeed = (prefix: string): number => {
  let seed = 2_166_136_261;
  for (const character of prefix) {
    seed = Math.imul(seed ^ character.charCodeAt(0), 16_777_619);
  }

  return seed >>> 0;
};

type ExplicitGcGlobal = typeof globalThis & {
  gc?: () => void;
};

const writeLine = (value: string): void => {
  process.stdout.write(`${value}\n`);
};

const forceFullGc = async (): Promise<number> => {
  const collectGarbage = (globalThis as ExplicitGcGlobal).gc;
  if (!collectGarbage) {
    throw new Error(
      "Retained-heap soak requires Node.js with --expose-gc enabled",
    );
  }

  collectGarbage();
  await new Promise<void>((resolve) => setImmediate(resolve));
  collectGarbage();
  await new Promise<void>((resolve) => setImmediate(resolve));
  collectGarbage();

  return process.memoryUsage().heapUsed;
};

const createLifecycleOther = (iteration: number, index: number): Other =>
  ({
    id: iteration * 100 + index,
    nick: `Lifecycle player ${iteration}-${index}`,
    x: index % 32,
    y: index % 24,
  }) as unknown as Other;

const createLifecycleNpc = (
  iteration: number,
  index: number,
): GameNpc & { location: string; notificationSent: boolean } =>
  ({
    hpp: 100,
    icon: `lifecycle-npc-${iteration}-${index}.gif`,
    id: iteration * 100 + index,
    location: `Lifecycle map ${iteration}`,
    lvl: 100 + index,
    name: `Lifecycle NPC ${iteration}-${index}`,
    notificationSent: false,
    prof: "w",
    type: 2,
    wt: 20,
    x: index % 32,
    y: index % 24,
  }) as unknown as GameNpc & {
    location: string;
    notificationSent: boolean;
  };

const createNotificationPresentation = (
  index: number,
  prefix = "soak",
): NotificationPresentation => ({
  autoHideDurationMs: 30_000,
  notification: {
    createdAt: new Date(FIXED_TIMESTAMP_MS + index).toISOString(),
    discordId: `${prefix}-discord-${index % 500}`,
    guildId: `soak-guild-${index % CHAT_GUILD_COUNT}`,
    message: `${prefix} notification ${index} ${"n".repeat(96)}`,
    notificationId: `${prefix}-notification-${index}`,
    servers: [`soak-server-${index % 3}`],
    type: "chat-mention",
    world: `soak-world-${index % 3}`,
  },
});

const createChatMessage = (
  index: number,
  guildId: string,
  prefix = "soak",
): ChatMessageResponseDtoOutput =>
  ({
    characterData: {
      id: `${prefix}-character-${index}`,
      lvl: (index % 300) + 1,
      name: `${prefix} character ${index}`,
      nick: `${prefix} character ${index}`,
      prof: "w",
    },
    createdAt: new Date(FIXED_TIMESTAMP_MS + index).toISOString(),
    guildId,
    id: `${prefix}-message-${index}`,
    message: `${prefix} chat message ${index} ${createDeterministicText(192, getPrefixSeed(prefix) ^ index)}`,
    senderId: `${prefix}-sender-${index % 500}`,
    timestamp: new Date(FIXED_TIMESTAMP_MS + index).toISOString(),
    type: MessageType.NORMAL,
  }) as unknown as ChatMessageResponseDtoOutput;

const createBattleEvents = (
  captureIndex: number,
  prefix: string,
): GameEvent[] => {
  const prefixSeed = getPrefixSeed(prefix);

  return Array.from({ length: BATTLE_EVENTS_PER_CAPTURE }, (_, eventIndex) => ({
    ev: captureIndex * BATTLE_EVENTS_PER_CAPTURE + eventIndex,
    f: {
      m: [
        createDeterministicText(
          BATTLE_TURN_SIZE,
          prefixSeed ^ (captureIndex * 131 + eventIndex),
        ),
      ],
    },
  }));
};

const getTransientRecordCount = (): number =>
  useNotificationsStore.getState().notifications.length +
  useNpcDetectorStore.getState().npcs.length +
  Object.keys(useOthersStore.getState().othersById).length +
  useBattleStore.getState().events.length;

const createAirTagAcknowledgement = (
  requestId: string,
  mapId: number,
  iteration: number,
): AirTagSubscriptionAck => ({
  requestId,
  scopes: [
    {
      epochId: `soak-epoch-${iteration}`,
      epochStartedAt: FIXED_TIMESTAMP_MS + iteration,
      guildId: "soak-guild-0",
      mapId,
      revision: 1,
      targets: [
        {
          nickname: `Soak target ${iteration}`,
          observedAt: FIXED_TIMESTAMP_MS + iteration,
          relation: 1,
          targetId: `soak-target-${iteration}`,
          x: iteration % 32,
          y: iteration % 24,
        },
      ],
      world: "soak-world",
    },
  ],
  status: "accepted",
});

const createMapPing = (
  pingId: string,
  mapId: number,
  iteration: number,
): MapPingEvent => ({
  createdAt: FIXED_TIMESTAMP_MS + iteration,
  mapId,
  pingId,
  sender: {
    characterId: `soak-character-${iteration}`,
    name: `Soak player ${iteration}`,
  },
  type: "attention",
  world: "soak-world",
  x: iteration % 32,
  y: iteration % 24,
});

const runLifecycleMapWorkload = (
  sampleHeap: () => void,
  prefix: string,
): SoakStructuralMetrics["lifecycle"] => {
  const mapChangeProcessor = new MapChangeProcessor();
  const distinctMapIds = new Set<number>();
  let airTagClearsVerified = 0;
  let interactionCancelsVerified = 0;
  let mapChangesProcessed = 0;
  let mapPingClearsVerified = 0;
  let npcClearedTransitions = 0;
  let resetsCompleted = 0;
  let transientRecordsAfterReset = 0;

  mapPingInteractionController.cancel();
  mapPingController.clear();
  airTagReceiveController.clear();

  for (let iteration = 0; iteration < LIFECYCLE_MAP_COUNT; iteration += 1) {
    const mapId = 10_000 + iteration;
    const mapName = `Soak map ${iteration}`;
    const others = Object.fromEntries(
      Array.from({ length: 25 }, (_, index) => [
        String(iteration * 100 + index),
        createLifecycleOther(iteration, index),
      ]),
    );
    const npcs = Array.from({ length: 25 }, (_, index) =>
      createLifecycleNpc(iteration, index),
    );
    const notifications = Array.from({ length: 25 }, (_, index) =>
      createNotificationPresentation(iteration * 25 + index),
    );

    useOthersStore.getState().setMany(others);
    useNpcDetectorStore.getState().addNpc(npcs);
    useNotificationsStore.getState().presentNotifications(notifications);
    useBattleStore.getState().clearEvents();
    useBattleStore.getState().addEvent({
      f: { m: [`lifecycle-turn-${iteration}`] },
    });
    const pingId = `${prefix}-ping-${iteration}`;
    const mapPing = createMapPing(pingId, mapId, iteration);
    const pingWasSeeded = mapPingController.addRemote(mapPing, "Attention");
    const interactionWasSeeded = mapPingInteractionController.begin({
      identity: { code: "KeyM", kind: "keyboard" },
      mapId,
      origin: { x: 320, y: 240 },
      tile: { x: iteration % 32, y: iteration % 24 },
    });
    const requestId = `${prefix}-air-tag-${iteration}`;
    airTagReceiveController.beginSubscription(requestId, "soak-world", mapId);
    airTagReceiveController.applySubscriptionAck(
      createAirTagAcknowledgement(requestId, mapId, iteration),
    );
    const airTagWasSeeded =
      airTagReceiveController.getRenderableTargets(
        FIXED_TIMESTAMP_MS + iteration,
        Number.MAX_SAFE_INTEGER,
      ).length === 1;
    sampleHeap();

    mapChangeProcessor.handle({
      town: { id: mapId, name: mapName },
    } as GameEvent);
    mapChangesProcessed += 1;
    distinctMapIds.add(mapId);

    if (iteration > 0 && useNpcDetectorStore.getState().npcs.length === 0) {
      npcClearedTransitions += 1;
    }
    if (interactionWasSeeded && !mapPingInteractionController.isActive()) {
      interactionCancelsVerified += 1;
    }
    if (
      airTagWasSeeded &&
      airTagReceiveController.getRenderableTargets(
        FIXED_TIMESTAMP_MS + iteration,
        Number.MAX_SAFE_INTEGER,
      ).length === 0
    ) {
      airTagClearsVerified += 1;
    }
    if (pingWasSeeded && mapPingController.addRemote(mapPing, "Attention")) {
      mapPingClearsVerified += 1;
    }
    mapPingController.clear();

    resetTransientRuntimeState();
    resetsCompleted += 1;
    transientRecordsAfterReset = Math.max(
      transientRecordsAfterReset,
      getTransientRecordCount(),
    );
  }

  return {
    airTagClearsVerified,
    distinctMapIds: distinctMapIds.size,
    expectedMapChanges: LIFECYCLE_MAP_COUNT,
    expectedNpcClearedTransitions: LIFECYCLE_MAP_COUNT - 1,
    expectedResets: LIFECYCLE_MAP_COUNT,
    interactionCancelsVerified,
    mapChangesPerIteration: LIFECYCLE_MAP_COUNT,
    mapChangesProcessed,
    mapPingClearsVerified,
    npcClearedTransitions,
    resetsCompleted,
    transientRecordsAfterReset,
  };
};

const runChatWorkload = (
  sampleHeap: () => void,
  prefix: string,
): SoakStructuralMetrics["chat"] => {
  const guildIds = Array.from(
    { length: CHAT_GUILD_COUNT },
    (_, index) => `soak-guild-${index}`,
  );

  for (let index = 0; index < CHAT_MESSAGE_COUNT; index += 1) {
    const guildId = guildIds[index % guildIds.length];
    const message = createChatMessage(index, guildId, prefix);
    updateChatMessagesCache({
      guildId,
      queryClient,
      updater: (messages) => upsertChatMessage(messages, message),
    });

    if ((index + 1) % 250 === 0) {
      sampleHeap();
    }
  }

  const retainedMessagesByGuild = guildIds.map((guildId) => {
    return (
      queryClient.getQueryData<ChatMessageResponseDtoOutput[]>(
        getChatControllerGetChatMessagesQueryKey({ guildId }),
      ) ?? []
    );
  });

  return {
    expectedMessages: CHAT_MESSAGE_COUNT,
    guilds: guildIds.length,
    maxMessagesPerGuild: Math.max(
      0,
      ...retainedMessagesByGuild.map((messages) => messages.length),
    ),
    messageLimitPerGuild: CHAT_MESSAGE_LIMIT_PER_GUILD,
    messagesProcessed: CHAT_MESSAGE_COUNT,
    totalRetainedMessages: retainedMessagesByGuild.reduce(
      (total, messages) => total + messages.length,
      0,
    ),
  };
};

const runNotificationWorkload = (
  sampleHeap: () => void,
  prefix: string,
): SoakStructuralMetrics["notifications"] => {
  for (
    let batchStart = 0;
    batchStart < NOTIFICATION_COUNT;
    batchStart += NOTIFICATION_BATCH_SIZE
  ) {
    const batchSize = Math.min(
      NOTIFICATION_BATCH_SIZE,
      NOTIFICATION_COUNT - batchStart,
    );
    const presentations = Array.from({ length: batchSize }, (_, offset) =>
      createNotificationPresentation(batchStart + offset, prefix),
    );
    useNotificationsStore.getState().presentNotifications(presentations);
    sampleHeap();
  }

  const notificationState = useNotificationsStore.getState();
  return {
    autoHideDeadlines: Object.keys(
      notificationState.notificationAutoHideByListKey,
    ).length,
    expectedNotifications: NOTIFICATION_COUNT,
    notificationLimit: NOTIFICATION_LIMIT,
    notificationsProcessed: NOTIFICATION_COUNT,
    retainedNotifications: notificationState.notifications.length,
  };
};

const runBattleAndLogWorkload = (
  sampleHeap: () => void,
  prefix = "soak",
): {
  battle: SoakStructuralMetrics["battle"];
  logs: SoakStructuralMetrics["logs"];
} => {
  let maxRetainedBytes = 0;
  let maxRetainedEvents = 0;
  let overflowedCaptures = 0;

  for (
    let captureIndex = 0;
    captureIndex < BATTLE_LOG_CAPTURE_COUNT;
    captureIndex += 1
  ) {
    const events = createBattleEvents(captureIndex, prefix);
    const battleStore = useBattleStore.getState();
    battleStore.clearEvents();
    for (const event of events) {
      battleStore.addEvent(event);
    }

    const capture = battleStore.getCaptureSnapshot();
    maxRetainedBytes = Math.max(maxRetainedBytes, capture.bytes);
    maxRetainedEvents = Math.max(maxRetainedEvents, capture.events.length);
    if (capture.overflowed) {
      overflowedCaptures += 1;
    } else {
      const action = startLoggedAction({
        actionType: "soak_battle_capture",
        payload: {
          captureIndex,
          eventCount: capture.events.length,
        },
      });
      action.logRequestSuccess({
        endpoint: "/soak/battles",
        method: "POST",
        payload: { events: capture.events },
        response: { battleId: `${prefix}-battle-${captureIndex}` },
        statusCode: 201,
      });
      action.complete({
        details: { eventCount: capture.events.length },
        status: "success",
      });
    }

    battleStore.clearEvents();
    if ((captureIndex + 1) % 5 === 0) {
      sampleHeap();
    }
  }

  const retainedActions = useLogsStore.getState().actions;
  const retainedLogBytes = textEncoder.encode(
    JSON.stringify(retainedActions),
  ).byteLength;

  return {
    battle: {
      byteLimit: MAX_BATTLE_CAPTURE_BYTES,
      capturesProcessed: BATTLE_LOG_CAPTURE_COUNT,
      eventLimit: MAX_BATTLE_CAPTURE_EVENTS,
      expectedCaptures: BATTLE_LOG_CAPTURE_COUNT,
      maxRetainedBytes,
      maxRetainedEvents,
      overflowedCaptures,
    },
    logs: {
      actionLimit: LOGS_CAP,
      byteLimit: LOGS_BYTE_CAP,
      capturesProcessed: BATTLE_LOG_CAPTURE_COUNT,
      expectedCaptures: BATTLE_LOG_CAPTURE_COUNT,
      retainedActions: retainedActions.length,
      retainedBytes: retainedLogBytes,
    },
  };
};

const resolveOutputPath = (
  outputDirectory: string,
  configuredPath: string | undefined,
  defaultFileName: string,
): string =>
  path.resolve(
    process.cwd(),
    configuredPath ?? path.join(outputDirectory, defaultFileName),
  );

const writeReports = async (
  report: SoakReport,
): Promise<{ jsonPath: string; markdownPath: string }> => {
  const outputDirectory =
    process.env.SOAK_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIRECTORY;
  const jsonPath = resolveOutputPath(
    outputDirectory,
    process.env.SOAK_JSON,
    "retained-heap-soak.json",
  );
  const markdownPath = resolveOutputPath(
    outputDirectory,
    process.env.SOAK_MARKDOWN,
    "retained-heap-soak.md",
  );

  await Promise.all([
    mkdir(path.dirname(jsonPath), { recursive: true }),
    mkdir(path.dirname(markdownPath), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, buildSoakMarkdown(report), "utf8"),
  ]);

  return { jsonPath, markdownPath };
};

const clearSoakState = (): void => {
  mapPingInteractionController.cancel();
  mapPingController.clear();
  airTagRuntime.shutdown();
  resetTransientRuntimeState();
  useLogsStore.getState().clearActions();
  queryClient.clear();
};

const runFullWorkload = (
  sampleHeap: () => void,
  prefix: string,
): SoakStructuralMetrics => {
  const lifecycle = runLifecycleMapWorkload(sampleHeap, prefix);
  const chat = runChatWorkload(sampleHeap, prefix);
  const notifications = runNotificationWorkload(sampleHeap, prefix);
  const { battle, logs } = runBattleAndLogWorkload(sampleHeap, prefix);

  return { battle, chat, lifecycle, logs, notifications };
};

const sumMetric = (
  metrics: SoakStructuralMetrics[],
  selector: (metric: SoakStructuralMetrics) => number,
): number => metrics.reduce((total, metric) => total + selector(metric), 0);

const maxMetric = (
  metrics: SoakStructuralMetrics[],
  selector: (metric: SoakStructuralMetrics) => number,
): number => Math.max(0, ...metrics.map(selector));

const aggregateStructuralMetrics = (
  metrics: SoakStructuralMetrics[],
): SoakStructuralMetrics => {
  const finalMetrics = metrics[metrics.length - 1];
  if (!finalMetrics) {
    throw new Error("Retained-heap soak produced no workload samples");
  }

  return {
    battle: {
      ...finalMetrics.battle,
      capturesProcessed: sumMetric(
        metrics,
        (metric) => metric.battle.capturesProcessed,
      ),
      expectedCaptures: sumMetric(
        metrics,
        (metric) => metric.battle.expectedCaptures,
      ),
      maxRetainedBytes: maxMetric(
        metrics,
        (metric) => metric.battle.maxRetainedBytes,
      ),
      maxRetainedEvents: maxMetric(
        metrics,
        (metric) => metric.battle.maxRetainedEvents,
      ),
      overflowedCaptures: sumMetric(
        metrics,
        (metric) => metric.battle.overflowedCaptures,
      ),
    },
    chat: {
      ...finalMetrics.chat,
      expectedMessages: sumMetric(
        metrics,
        (metric) => metric.chat.expectedMessages,
      ),
      maxMessagesPerGuild: maxMetric(
        metrics,
        (metric) => metric.chat.maxMessagesPerGuild,
      ),
      messagesProcessed: sumMetric(
        metrics,
        (metric) => metric.chat.messagesProcessed,
      ),
    },
    lifecycle: {
      ...finalMetrics.lifecycle,
      airTagClearsVerified: sumMetric(
        metrics,
        (metric) => metric.lifecycle.airTagClearsVerified,
      ),
      distinctMapIds: maxMetric(
        metrics,
        (metric) => metric.lifecycle.distinctMapIds,
      ),
      expectedMapChanges: sumMetric(
        metrics,
        (metric) => metric.lifecycle.expectedMapChanges,
      ),
      expectedNpcClearedTransitions: sumMetric(
        metrics,
        (metric) => metric.lifecycle.expectedNpcClearedTransitions,
      ),
      expectedResets: sumMetric(
        metrics,
        (metric) => metric.lifecycle.expectedResets,
      ),
      interactionCancelsVerified: sumMetric(
        metrics,
        (metric) => metric.lifecycle.interactionCancelsVerified,
      ),
      mapChangesProcessed: sumMetric(
        metrics,
        (metric) => metric.lifecycle.mapChangesProcessed,
      ),
      mapPingClearsVerified: sumMetric(
        metrics,
        (metric) => metric.lifecycle.mapPingClearsVerified,
      ),
      npcClearedTransitions: sumMetric(
        metrics,
        (metric) => metric.lifecycle.npcClearedTransitions,
      ),
      resetsCompleted: sumMetric(
        metrics,
        (metric) => metric.lifecycle.resetsCompleted,
      ),
      transientRecordsAfterReset: maxMetric(
        metrics,
        (metric) => metric.lifecycle.transientRecordsAfterReset,
      ),
    },
    logs: {
      ...finalMetrics.logs,
      capturesProcessed: sumMetric(
        metrics,
        (metric) => metric.logs.capturesProcessed,
      ),
      expectedCaptures: sumMetric(
        metrics,
        (metric) => metric.logs.expectedCaptures,
      ),
    },
    notifications: {
      ...finalMetrics.notifications,
      expectedNotifications: sumMetric(
        metrics,
        (metric) => metric.notifications.expectedNotifications,
      ),
      notificationsProcessed: sumMetric(
        metrics,
        (metric) => metric.notifications.notificationsProcessed,
      ),
    },
  };
};

const warmBoundedStructures = (): void => {
  runFullWorkload(() => undefined, "warmup");
};

const collectPostGcWorkloadSamples = async (
  sampleHeap: () => void,
): Promise<{
  postGcSamplesBytes: number[];
  workloadMetrics: SoakStructuralMetrics[];
}> => {
  const workloadMetrics: SoakStructuralMetrics[] = [];
  const postGcSamplesBytes: number[] = [];

  const runIteration = async (iteration: number): Promise<void> => {
    if (iteration >= POST_GC_TREND_SAMPLE_COUNT) {
      return;
    }

    workloadMetrics.push(runFullWorkload(sampleHeap, `measured-${iteration}`));
    sampleHeap();
    const postGcBytes = await forceFullGc();
    postGcSamplesBytes.push(postGcBytes);
    writeLine(
      `[soak] post-GC sample ${iteration + 1}/${POST_GC_TREND_SAMPLE_COUNT}: ${(postGcBytes / (1024 * 1024)).toFixed(2)} MiB`,
    );
    await runIteration(iteration + 1);
  };

  await runIteration(0);
  return { postGcSamplesBytes, workloadMetrics };
};

export const runRetainedHeapSoak = async (): Promise<SoakReport> => {
  clearSoakState();
  warmBoundedStructures();
  const beforeBytes = await forceFullGc();
  let peakBytes = beforeBytes;
  const sampleHeap = () => {
    peakBytes = Math.max(peakBytes, process.memoryUsage().heapUsed);
  };
  const startedAt = performance.now();

  try {
    const { postGcSamplesBytes, workloadMetrics } =
      await collectPostGcWorkloadSamples(sampleHeap);

    const structural = aggregateStructuralMetrics(workloadMetrics);
    const afterGcBytes =
      postGcSamplesBytes[postGcSamplesBytes.length - 1] ?? beforeBytes;
    const report = createSoakReport({
      durationMs: performance.now() - startedAt,
      heap: { afterGcBytes, beforeBytes, peakBytes, postGcSamplesBytes },
      structural,
    });
    const outputPaths = await writeReports(report);

    writeLine(
      `[soak] heap before=${(beforeBytes / (1024 * 1024)).toFixed(2)} MiB peak=${(peakBytes / (1024 * 1024)).toFixed(2)} MiB after-GC=${(afterGcBytes / (1024 * 1024)).toFixed(2)} MiB limit=${(report.heap.afterGcLimitBytes / (1024 * 1024)).toFixed(2)} MiB`,
    );
    writeLine(
      `[soak] map-changes=${structural.lifecycle.mapChangesProcessed} (${POST_GC_TREND_SAMPLE_COUNT} x ${structural.lifecycle.distinctMapIds} distinct) NPC-clears=${structural.lifecycle.npcClearedTransitions} ping-clears=${structural.lifecycle.mapPingClearsVerified} AirTag-clears=${structural.lifecycle.airTagClearsVerified}`,
    );
    writeLine(
      `[soak] trend slope=${(report.trend.robustSlopeBytesPerIteration / (1024 * 1024)).toFixed(2)} MiB/iteration total=${(report.trend.totalGrowthBytes / (1024 * 1024)).toFixed(2)} MiB detected=${report.trend.monotonicGrowthDetected}`,
    );
    writeLine(
      `[soak] chat=${structural.chat.totalRetainedMessages} (${structural.chat.maxMessagesPerGuild}/guild) notifications=${structural.notifications.retainedNotifications} logs=${structural.logs.retainedActions}/${(structural.logs.retainedBytes / (1024 * 1024)).toFixed(2)} MiB`,
    );
    writeLine(`[soak] JSON: ${outputPaths.jsonPath}`);
    writeLine(`[soak] Markdown: ${outputPaths.markdownPath}`);

    if (!report.gate.passed) {
      throw new Error(
        `Retained-heap soak failed: ${report.gate.failures.join("; ")}`,
      );
    }

    return report;
  } finally {
    clearSoakState();
  }
};
