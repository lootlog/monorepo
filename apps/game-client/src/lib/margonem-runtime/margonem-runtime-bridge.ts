import type { GameEvent } from "@lootlog/margonem/game-events";
import { captureRuntimeObserverFailure } from "@/lib/error-monitoring";
import { parseRuntimeFacts } from "./runtime-event-parser";
import {
  createRuntimeAdapter,
  type MargonemRuntimeAdapter,
} from "./runtime-adapter";
import type {
  RuntimeEventEnvelope,
  RuntimeEventHandler,
  RuntimeIntent,
  RuntimeIntentHandler,
  RuntimeObserverFailure,
} from "./runtime.types";

type RuntimeInterface = "ni" | "si";
type RuntimeFunction = (this: unknown, ...args: unknown[]) => unknown;
type RuntimeWindow = Window & {
  Engine?: {
    communication?: Record<string, unknown>;
  };
  _g?: RuntimeFunction;
  successData?: RuntimeFunction;
};
type RuntimeFunctionContainer = Record<string, unknown>;

const getRuntimeWindow = () => window as RuntimeWindow;

type BridgeOptions = {
  adapter?: MargonemRuntimeAdapter;
  interface?: RuntimeInterface;
  onFatalPipelineError?: () => void;
  onObserverError?: (failure: RuntimeObserverFailure) => void;
};

export type RuntimeBridgeHealth = Readonly<{
  adapter: RuntimeInterface | "unknown";
  queueBytes: number;
  queueEvents: number;
  queueFacts: number;
  ready: boolean;
  reason: string | null;
  seam: string | null;
  sequence: number;
  status: "installing" | "ready" | "fatal";
}>;

export const MAX_QUEUED_RUNTIME_EVENTS = 1_000;
export const MAX_QUEUED_RUNTIME_BYTES = 4 * 1024 * 1024;
export const MAX_QUEUED_RUNTIME_FACTS = 10_000;
const MAX_RECENT_RUNTIME_EVENT_IDS = 1_000;
const INSTALL_RETRY_DELAY_MS = 100;
const MAX_INSTALL_RETRIES = 20;

const EMPTY_INGRESS = Object.freeze({
  game: null,
  intent: null,
  npcsById: Object.freeze({}),
  othersById: Object.freeze({}),
});

export class MargonemRuntimeBridge {
  private readonly appliedHandlers = new Set<RuntimeEventHandler>();
  private readonly incomingHandlers = new Set<RuntimeEventHandler>();
  private readonly intentHandlers = new Set<RuntimeIntentHandler>();
  private readonly adapter?: MargonemRuntimeAdapter;
  private resolvedAdapter: MargonemRuntimeAdapter | null = null;
  private readonly onFatalPipelineError?: () => void;
  private readonly onObserverError?: (failure: RuntimeObserverFailure) => void;
  private readonly runtimeInterface?: RuntimeInterface;
  private readonly eventQueue: RuntimeEventEnvelope[] = [];
  private readonly recentEventIds = new Set<number>();
  private inboundContainer: RuntimeFunctionContainer | null = null;
  private inboundProperty: string | null = null;
  private originalInbound: RuntimeFunction | null = null;
  private originalOutgoing: RuntimeFunction | null = null;
  private wrappedInbound: RuntimeFunction | null = null;
  private wrappedOutgoing: RuntimeFunction | null = null;
  private fallbackOutgoingWrappers: Array<{
    container: RuntimeFunctionContainer;
    original: RuntimeFunction;
    property: string;
    wrapper: RuntimeFunction;
  }> = [];
  private sequence = 0;
  private queuedBytes = 0;
  private queuedFacts = 0;
  private installRetryCount = 0;
  private installRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  private failureReason: string | null = null;
  private inboundSeam: string | null = null;
  private ready = false;
  private activeIntent: RuntimeIntent | null = null;
  private gameInitCallback: (() => boolean) | null = null;
  private gameInitCallbackExecuted = false;
  private legacyProcessor: ((event: GameEvent) => void) | null = null;
  private unsubscribeLegacyProcessor: (() => void) | null = null;

  constructor(options: BridgeOptions = {}) {
    this.adapter = options.adapter;
    this.onFatalPipelineError = options.onFatalPipelineError;
    this.onObserverError = options.onObserverError;
    this.runtimeInterface = options.interface;
  }

  install(): boolean {
    this.detachInbound();
    this.detachOutgoing();
    this.installOutgoing();
    const runtimeInterface =
      this.runtimeInterface ??
      (typeof getRuntimeWindow().Engine === "object" ? "ni" : "si");
    const inbound = this.resolveInbound(runtimeInterface);
    if (!inbound) {
      this.failureReason = "missing-inbound-seam";
      this.scheduleInstallRetry();
      return false;
    }
    this.clearInstallRetry();
    this.failureReason = null;
    this.inboundSeam = `${runtimeInterface}:${inbound.property}`;

    const { container, property, original: originalInbound } = inbound;
    const createEnvelope = this.createEnvelopeSafely.bind(this);
    const receiveIncoming = this.receiveIncoming.bind(this);
    const emitApplied = (envelope: RuntimeEventEnvelope) => {
      this.emit(this.appliedHandlers, envelope, "applied");
      this.activeIntent = null;
    };
    const wrappedInbound: RuntimeFunction = function (...args) {
      const envelope = createEnvelope(args[0]);
      if (envelope) receiveIncoming(envelope);
      const result = Reflect.apply(originalInbound, this, args);
      if (envelope) emitApplied(envelope);
      return result;
    };

    this.originalInbound = originalInbound;
    this.wrappedInbound = wrappedInbound;
    this.inboundContainer = container;
    this.inboundProperty = property;
    container[property] = wrappedInbound;
    return container[property] === wrappedInbound;
  }

  bootstrap(): boolean {
    if (
      this.wrappedInbound &&
      this.inboundContainer?.[this.inboundProperty ?? ""] ===
        this.wrappedInbound
    ) {
      return true;
    }
    return this.install();
  }

  setupProxies(): boolean {
    return this.install();
  }

  setProcessor(processor: (event: GameEvent) => void): void {
    this.legacyProcessor = processor;
    this.unsubscribeLegacyProcessor?.();
    this.unsubscribeLegacyProcessor = this.subscribeIncoming((envelope) => {
      if (envelope.raw) processor(envelope.raw);
    });
  }

  removeProcessor(): void {
    this.unsubscribeLegacyProcessor?.();
    this.unsubscribeLegacyProcessor = null;
    this.legacyProcessor = null;
  }

  subscribeAfterGameEvent(handler: (event: GameEvent) => void): () => void {
    return this.subscribeApplied((envelope) => {
      if (envelope.raw) handler(envelope.raw);
    });
  }

  setGameInitCallback(callback: () => boolean): void {
    this.gameInitCallback = callback;
    this.gameInitCallbackExecuted = false;
  }

  triggerManualEvent(event: GameEvent): boolean {
    if (!import.meta.env.DEV) return false;
    const envelope = this.createEnvelope(event);
    if (!envelope) return false;
    this.emit(this.incomingHandlers, envelope, "incoming");
    return true;
  }

  setReady(ready = true): void {
    this.ready = ready;
    if (!ready || this.eventQueue.length === 0) return;
    const queuedEvents = this.eventQueue.splice(0);
    this.queuedBytes = 0;
    this.queuedFacts = 0;
    for (const envelope of queuedEvents) {
      this.emit(this.incomingHandlers, envelope, "incoming");
    }
  }

  subscribeIncoming(handler: RuntimeEventHandler): () => void {
    this.incomingHandlers.add(handler);
    return () => this.incomingHandlers.delete(handler);
  }

  subscribeApplied(handler: RuntimeEventHandler): () => void {
    this.appliedHandlers.add(handler);
    return () => this.appliedHandlers.delete(handler);
  }

  subscribeIntent(handler: RuntimeIntentHandler): () => void {
    this.intentHandlers.add(handler);
    return () => this.intentHandlers.delete(handler);
  }

  getHealth(): RuntimeBridgeHealth {
    let status: RuntimeBridgeHealth["status"] = "installing";
    if (this.failureReason?.startsWith("fatal:")) status = "fatal";
    else if (this.inboundSeam) status = "ready";
    return Object.freeze({
      adapter:
        this.runtimeInterface ?? this.resolvedAdapter?.interface ?? "unknown",
      queueBytes: this.queuedBytes,
      queueEvents: this.eventQueue.length,
      queueFacts: this.queuedFacts,
      ready: this.ready,
      reason: this.failureReason,
      seam: this.inboundSeam,
      sequence: this.sequence,
      status,
    });
  }

  cleanup(): void {
    this.removeProcessor();
    this.detachInbound();
    this.detachOutgoing();
    this.incomingHandlers.clear();
    this.appliedHandlers.clear();
    this.intentHandlers.clear();
    this.ready = false;
    this.sequence = 0;
    this.eventQueue.length = 0;
    this.recentEventIds.clear();
    this.queuedBytes = 0;
    this.queuedFacts = 0;
    this.clearInstallRetry();
    this.activeIntent = null;
    this.gameInitCallback = null;
    this.gameInitCallbackExecuted = false;
    this.resolvedAdapter = null;
    this.failureReason = null;
    this.inboundSeam = null;
  }

  private installOutgoing(): boolean {
    let installed = false;
    const runtimeWindow = getRuntimeWindow();
    if (typeof runtimeWindow._g === "function") {
      const originalOutgoing = runtimeWindow._g;
      const observeIntent = this.observeIntent.bind(this);
      const wrappedOutgoing: RuntimeFunction = function (...args) {
        observeIntent(args[0]);

        // Never modify the arguments, payload, callbacks, or return value of an outgoing Margonem request.
        return Reflect.apply(originalOutgoing, this, args);
      };

      this.originalOutgoing = originalOutgoing;
      this.wrappedOutgoing = wrappedOutgoing;
      runtimeWindow._g = wrappedOutgoing;
      installed = runtimeWindow._g === wrappedOutgoing;
    }

    const communication = runtimeWindow.Engine?.communication as unknown as
      | RuntimeFunctionContainer
      | undefined;
    if (communication) {
      for (const property of ["send", "send2"] as const) {
        const original = communication[property];
        if (typeof original !== "function") continue;
        const observeIntent = this.observeIntent.bind(this);
        const originalFunction = original as RuntimeFunction;
        const wrapper: RuntimeFunction = function (...args) {
          observeIntent(args[0]);

          // Never modify the arguments, payload, callbacks, or return value of an outgoing Margonem request.
          return Reflect.apply(originalFunction, this, args);
        };
        communication[property] = wrapper;
        this.fallbackOutgoingWrappers.push({
          container: communication,
          original: originalFunction,
          property,
          wrapper,
        });
        installed = true;
      }
    }
    return installed;
  }

  private observeIntent(command: unknown): void {
    const intent = this.parseIntent(command);
    if (!intent) return;
    const activeIntent = this.activeIntent;
    const improvesSnapshot = !activeIntent?.npc && Boolean(intent.npc);
    if (activeIntent?.npcId === intent.npcId && !improvesSnapshot) return;
    this.activeIntent = intent;
    for (const handler of this.intentHandlers) {
      try {
        handler(intent);
      } catch (error) {
        this.reportObserverFailure({
          error,
          phase: "intent",
          sequence: this.sequence,
        });
        continue;
      }
    }
  }

  private parseIntent(command: unknown): RuntimeIntent | null {
    if (typeof command !== "string") return null;
    const [action, ...queryParts] = command.split("&");
    if (action !== "talk") return null;
    const npcId = Number(
      new URLSearchParams(queryParts.join("&")).get("id") ?? "",
    );
    if (!Number.isSafeInteger(npcId) || npcId <= 0) return null;
    let npc = null;
    try {
      npc = (this.adapter ?? this.getAdapter())?.getNpc(npcId) ?? null;
    } catch {
      npc = null;
    }
    return Object.freeze({ npc, npcId, type: "talk" });
  }

  private createEnvelope(payload: unknown): RuntimeEventEnvelope | null {
    if (this.gameInitCallback && !this.gameInitCallbackExecuted) {
      this.gameInitCallbackExecuted = this.gameInitCallback();
    }
    let event: GameEvent;
    if (typeof payload === "string") {
      try {
        event = JSON.parse(payload) as GameEvent;
      } catch {
        return null;
      }
    } else if (payload && typeof payload === "object") {
      event = payload as GameEvent;
    } else {
      return null;
    }

    this.sequence += 1;
    const adapter = this.adapter ?? this.getAdapter();
    const npcIds = new Set<number>();
    for (const deletion of event.npcs_del ?? []) npcIds.add(deletion.id);
    const dialogNpcId = Number(
      Array.isArray(event.d) ? event.d[2] : Number.NaN,
    );
    if (Number.isSafeInteger(dialogNpcId) && dialogNpcId > 0) {
      npcIds.add(dialogNpcId);
    }
    const npcsById: Record<
      number,
      NonNullable<ReturnType<MargonemRuntimeAdapter["getNpc"]>>
    > = {};
    const otherIds = new Set<string>();
    for (const warriorId of Object.keys(event.f?.w ?? {})) {
      const numericId = Number(warriorId);
      if (numericId > 0) otherIds.add(warriorId);
    }
    const othersById: Record<
      string,
      NonNullable<ReturnType<MargonemRuntimeAdapter["getOther"]>>
    > = {};
    if (adapter) {
      for (const npcId of npcIds) {
        try {
          const npc = adapter.getNpc(npcId);
          if (npc) npcsById[npcId] = npc;
        } catch {
          continue;
        }
      }
    }
    if (adapter) {
      for (const otherId of otherIds) {
        try {
          const other = adapter.getOther(otherId);
          if (other) othersById[otherId] = other;
        } catch {
          continue;
        }
      }
    }
    let game = null;
    try {
      game = adapter?.getGameSnapshot() ?? null;
    } catch {
      game = null;
    }
    return Object.freeze({
      facts: parseRuntimeFacts(event),
      ingress: Object.freeze({
        ...EMPTY_INGRESS,
        game,
        intent: this.activeIntent,
        npcsById: Object.freeze(npcsById),
        othersById: Object.freeze(othersById),
      }),
      observedAt: Date.now(),
      raw: event,
      sequence: this.sequence,
    });
  }

  private createEnvelopeSafely(payload: unknown): RuntimeEventEnvelope | null {
    try {
      return this.createEnvelope(payload);
    } catch (error) {
      this.reportObserverFailure({
        error,
        phase: "incoming",
        sequence: this.sequence,
      });
      return null;
    }
  }

  private receiveIncoming(envelope: RuntimeEventEnvelope): void {
    if (this.isDuplicateIncomingEvent(envelope.raw)) return;

    if (this.ready) {
      this.emit(this.incomingHandlers, envelope, "incoming");
      return;
    }
    const rawBytes = this.estimateRawBytes(envelope.raw);
    const nextFacts = this.queuedFacts + envelope.facts.length;
    if (
      this.eventQueue.length >= MAX_QUEUED_RUNTIME_EVENTS ||
      this.queuedBytes + rawBytes > MAX_QUEUED_RUNTIME_BYTES ||
      nextFacts > MAX_QUEUED_RUNTIME_FACTS
    ) {
      this.failureReason = "fatal:queue-overflow";
      this.onFatalPipelineError?.();
      return;
    }
    this.eventQueue.push(envelope);
    this.queuedBytes += rawBytes;
    this.queuedFacts = nextFacts;
  }

  private isDuplicateIncomingEvent(event: GameEvent | undefined): boolean {
    const eventId = event?.ev;
    if (typeof eventId !== "number" || !Number.isFinite(eventId)) return false;
    if (this.recentEventIds.has(eventId)) return true;

    this.recentEventIds.add(eventId);
    if (this.recentEventIds.size > MAX_RECENT_RUNTIME_EVENT_IDS) {
      const oldestEventId = this.recentEventIds.values().next().value;
      if (oldestEventId !== undefined) {
        this.recentEventIds.delete(oldestEventId);
      }
    }
    return false;
  }

  private estimateRawBytes(event: GameEvent | undefined): number {
    if (!event) return 0;
    try {
      return JSON.stringify(event).length * 2;
    } catch {
      return 0;
    }
  }

  private scheduleInstallRetry(): void {
    if (this.installRetryTimeout) return;
    if (this.installRetryCount >= MAX_INSTALL_RETRIES) {
      this.failureReason = "fatal:missing-inbound-seam";
      this.onFatalPipelineError?.();
      return;
    }
    this.installRetryCount += 1;
    this.installRetryTimeout = setTimeout(() => {
      this.installRetryTimeout = null;
      this.install();
    }, INSTALL_RETRY_DELAY_MS);
  }

  private clearInstallRetry(): void {
    if (this.installRetryTimeout) clearTimeout(this.installRetryTimeout);
    this.installRetryTimeout = null;
    this.installRetryCount = 0;
  }

  private getAdapter(): MargonemRuntimeAdapter | null {
    if (this.resolvedAdapter) return this.resolvedAdapter;
    try {
      this.resolvedAdapter = createRuntimeAdapter();
      return this.resolvedAdapter;
    } catch {
      return null;
    }
  }

  private resolveInbound(runtimeInterface: RuntimeInterface): {
    container: RuntimeFunctionContainer;
    original: RuntimeFunction;
    property: string;
  } | null {
    const runtimeWindow = window as RuntimeWindow;
    if (runtimeInterface === "ni") {
      const communication = getRuntimeWindow().Engine
        ?.communication as unknown as RuntimeFunctionContainer | undefined;
      if (communication && typeof communication.parseJSON === "function") {
        return {
          container: communication,
          original: communication.parseJSON as RuntimeFunction,
          property: "parseJSON",
        };
      }
      if (communication && typeof communication.successData === "function") {
        return {
          container: communication,
          original: communication.successData as RuntimeFunction,
          property: "successData",
        };
      }
    }
    if (typeof runtimeWindow.successData !== "function") return null;
    return {
      container: runtimeWindow as unknown as RuntimeFunctionContainer,
      original: runtimeWindow.successData,
      property: "successData",
    };
  }

  private emit(
    handlers: ReadonlySet<RuntimeEventHandler>,
    envelope: RuntimeEventEnvelope,
    phase: "applied" | "incoming",
  ): void {
    for (const handler of handlers) {
      try {
        handler(envelope);
      } catch (error) {
        this.reportObserverFailure({
          error,
          phase,
          sequence: envelope.sequence,
        });
        continue;
      }
    }
  }

  private reportObserverFailure(failure: RuntimeObserverFailure): void {
    try {
      this.onObserverError?.(failure);
    } catch {
      // Diagnostics must never affect Margonem or the remaining observers.
    }
  }

  private detachInbound(): void {
    if (
      this.wrappedInbound &&
      this.inboundContainer &&
      this.inboundProperty &&
      this.inboundContainer[this.inboundProperty] === this.wrappedInbound
    ) {
      this.inboundContainer[this.inboundProperty] = this.originalInbound;
    }
    this.originalInbound = null;
    this.wrappedInbound = null;
    this.inboundContainer = null;
    this.inboundProperty = null;
    this.inboundSeam = null;
  }

  private detachOutgoing(): void {
    const runtimeWindow = getRuntimeWindow();
    if (this.wrappedOutgoing && runtimeWindow._g === this.wrappedOutgoing) {
      runtimeWindow._g = this.originalOutgoing ?? undefined;
    }
    this.originalOutgoing = null;
    this.wrappedOutgoing = null;
    for (const fallback of this.fallbackOutgoingWrappers) {
      if (fallback.container[fallback.property] === fallback.wrapper) {
        fallback.container[fallback.property] = fallback.original;
      }
    }
    this.fallbackOutgoingWrappers = [];
  }
}

function scheduleActiveRuntimeTeardown(): void {
  const runtimeWindow = window as Window & {
    __lootlogGameClientRuntime?: { dispose: () => void };
  };
  const failedRuntime = runtimeWindow.__lootlogGameClientRuntime;
  if (!failedRuntime) return;

  queueMicrotask(() => {
    if (runtimeWindow.__lootlogGameClientRuntime === failedRuntime) {
      failedRuntime.dispose();
    }
  });
}

export const margonemRuntimeBridge = new MargonemRuntimeBridge({
  onFatalPipelineError: scheduleActiveRuntimeTeardown,
  onObserverError: captureRuntimeObserverFailure,
});
