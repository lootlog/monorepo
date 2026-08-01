import type { GameEvent } from "@lootlog/margonem/game-events";
import { margonemRuntimeBridge } from "@/lib/margonem-runtime/margonem-runtime-bridge";
import { BattleEventProcessor } from "@/processors/battle-event-processor";
import { LootEventProcessor } from "@/processors/loot-event-processor";
import { ChatEventProcessor } from "@/processors/chat-event-processor";
import { DialogProcessor } from "@/processors/dialog-processor";
import { npcsDetectionProcessor } from "@/processors/npcs-detection-processor";
import { NpcsDeleteProcessor } from "@/processors/npcs-delete-processor";
import { MapChangeProcessor } from "@/processors/map-change-processor";
import { AfkProcessor } from "@/processors/afk-processor";
import { OtherEventProcessor } from "@/processors/other-event-processor";
import { parseRuntimeFacts } from "@/lib/margonem-runtime/runtime-event-parser";
import type {
  RuntimeEventEnvelope,
  RuntimeFact,
} from "@/lib/margonem-runtime/runtime.types";
import {
  measurePerformance,
  recordPerformance,
  runWithPerformanceContext,
} from "@/lib/performance-monitoring/performance-monitor";

const PERFORMANCE_MONITORING_ENABLED =
  import.meta.env.VITE_GAME_CLIENT_PERFORMANCE_MONITORING === "1";

function runSafe(
  name: string,
  handler: () => unknown,
  correlationId?: string,
): void {
  if (!PERFORMANCE_MONITORING_ENABLED) {
    try {
      const result = handler();
      if (result instanceof Promise) {
        void result.catch((error) => {
          console.warn(
            `[EventDispatcher] Failed to process ${name} handler:`,
            error,
          );
        });
      }
    } catch (error) {
      console.warn(
        `[EventDispatcher] Failed to process ${name} handler:`,
        error,
      );
    }
    return;
  }

  const promiseStartedAt = performance.now();
  try {
    const result = measurePerformance(
      `processor.${name}.sync`,
      "processor",
      undefined,
      handler,
    );

    if (result instanceof Promise) {
      const recordPromiseLatency = (outcome: "fulfilled" | "rejected") => {
        recordPerformance({
          category: "processor-promise",
          correlationId,
          data: { outcome },
          durationMs: performance.now() - promiseStartedAt,
          name: `processor.${name}.promise-latency`,
        });
      };
      void result.then(
        () => recordPromiseLatency("fulfilled"),
        (error) => {
          recordPromiseLatency("rejected");
          console.warn(
            `[EventDispatcher] Failed to process ${name} handler:`,
            error,
          );
        },
      );
    }
  } catch (error) {
    console.warn(`[EventDispatcher] Failed to process ${name} handler:`, error);
  }
}

export class EventDispatcher {
  private battle = new BattleEventProcessor();
  private loot = new LootEventProcessor();
  private chat = new ChatEventProcessor();
  private dialog = new DialogProcessor();
  private npcsDetection = npcsDetectionProcessor;
  private npcsDelete = new NpcsDeleteProcessor();
  private mapChange = new MapChangeProcessor();
  private afk = new AfkProcessor();
  private other = new OtherEventProcessor();
  private releaseProcessor: (() => boolean) | null = null;

  handleEvent = (event: GameEvent): void => {
    for (const fact of parseRuntimeFacts(event)) this.handleFact(fact);
  };

  handleEnvelope = (envelope: RuntimeEventEnvelope): void => {
    if (!PERFORMANCE_MONITORING_ENABLED) {
      for (const fact of envelope.facts) {
        this.handleFact(fact, envelope.ingress);
      }
      return;
    }

    const correlationId = `runtime-event-${envelope.sequence}`;
    runWithPerformanceContext(correlationId, () =>
      measurePerformance(
        "event-dispatcher.envelope",
        "event-dispatcher",
        { factCount: envelope.facts.length },
        () => {
          for (const fact of envelope.facts) {
            this.handleFact(fact, envelope.ingress, correlationId);
          }
        },
      ),
    );
  };

  private handleFact(
    fact: RuntimeFact,
    ingress?: RuntimeEventEnvelope["ingress"],
    correlationId?: string,
  ): void {
    const event = fact.event;
    if (fact.kind === "chat") {
      runSafe("chat", () => this.chat.handle(event), correlationId);
    }

    if (fact.kind === "dialog") {
      runSafe(
        "dialog",
        () => this.dialog.handle(event, ingress),
        correlationId,
      );
    }

    if (fact.kind === "battle") {
      runSafe(
        "battle",
        () => this.battle.handle(event, ingress),
        correlationId,
      );
    }

    if (fact.kind === "map") {
      runSafe("map-change", () => this.mapChange.handle(event), correlationId);
    }

    if (fact.kind === "npc-upsert") {
      runSafe(
        "npc-detection",
        () => this.npcsDetection.handle(event),
        correlationId,
      );
    }

    if (fact.kind === "loot") {
      if (event.loot?.source === "fight") {
        runSafe(
          "loot-from-battle",
          () => this.loot.handleLootFromBattle(event, ingress),
          correlationId,
        );
      } else if (event.loot?.source === "dialog") {
        runSafe(
          "dialog-loot",
          () => this.loot.handleDialogLoot(event, ingress),
          correlationId,
        );
      }
    }

    if (fact.kind === "npc-delete") {
      runSafe(
        "npcs-delete",
        () => this.npcsDelete.handle(event, ingress),
        correlationId,
      );
    }

    if (fact.kind === "other") {
      runSafe("other", () => this.other.handle(event), correlationId);
    }

    if (fact.kind === "afk") {
      runSafe("afk", () => this.afk.handle(event, ingress), correlationId);
    }
  }

  handleInitialEvents(): void {
    this.npcsDetection.bootstrapProjection();
  }

  register(): void {
    this.releaseProcessor?.();
    this.releaseProcessor = margonemRuntimeBridge.acquireProcessor(
      this.handleEnvelope,
    );
  }

  cleanup(): void {
    const releasedActiveProcessor = this.releaseProcessor?.() ?? false;
    this.releaseProcessor = null;
    if (releasedActiveProcessor) {
      this.npcsDetection.cleanup();
    }
  }
}
