import type { GameEvent } from "@lootlog/margonem/game-events";
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
  reason: string | null;
  seam: string | null;
  sequence: number;
  status: "installing" | "ready" | "fatal";
}>;

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
  private readonly intentHandlers = new Set<RuntimeIntentHandler>();
  private readonly adapter?: MargonemRuntimeAdapter;
  private resolvedAdapter: MargonemRuntimeAdapter | null = null;
  private readonly onFatalPipelineError?: () => void;
  private readonly onObserverError?: (failure: RuntimeObserverFailure) => void;
  private readonly runtimeInterface?: RuntimeInterface;
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
  private installRetryCount = 0;
  private installRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  private failureReason: string | null = null;
  private inboundSeam: string | null = null;
  private activeIntent: RuntimeIntent | null = null;
  private gameInitCallback: (() => boolean) | null = null;
  private gameInitCallbackExecuted = false;

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
    const initializeGame = this.initializeGameSafely.bind(this);
    const createEnvelope = this.createEnvelopeSafely.bind(this);
    const captureIntent = () => this.activeIntent;
    const clearIntent = () => {
      this.activeIntent = null;
    };
    const emitApplied = (envelope: RuntimeEventEnvelope) =>
      this.emit(this.appliedHandlers, envelope, "applied");
    const wrappedInbound: RuntimeFunction = function (...args) {
      initializeGame();
      const intent = captureIntent();
      const result = Reflect.apply(originalInbound, this, args);
      initializeGame();
      const envelope = createEnvelope(args[0], intent);
      clearIntent();
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

  setupProxies(): boolean {
    return this.install();
  }

  setGameInitCallback(callback: () => boolean): void {
    this.gameInitCallback = callback;
    this.gameInitCallbackExecuted = false;
  }

  triggerManualEvent(event: GameEvent): boolean {
    if (!import.meta.env.DEV) return false;
    const envelope = this.createEnvelope(event, this.activeIntent);
    if (!envelope) return false;
    this.emit(this.appliedHandlers, envelope, "applied");
    return true;
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
      reason: this.failureReason,
      seam: this.inboundSeam,
      sequence: this.sequence,
      status,
    });
  }

  cleanup(): void {
    this.detachInbound();
    this.detachOutgoing();
    this.appliedHandlers.clear();
    this.intentHandlers.clear();
    this.sequence = 0;
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

  private createEnvelope(
    payload: unknown,
    intent: RuntimeIntent | null,
  ): RuntimeEventEnvelope | null {
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
    const facts = parseRuntimeFacts(event);
    return Object.freeze({
      facts,
      ingress: Object.freeze({
        ...EMPTY_INGRESS,
        intent,
      }),
      observedAt: Date.now(),
      raw: event,
      sequence: this.sequence,
    });
  }

  private createEnvelopeSafely(
    payload: unknown,
    intent: RuntimeIntent | null,
  ): RuntimeEventEnvelope | null {
    try {
      return this.createEnvelope(payload, intent);
    } catch (error) {
      this.reportObserverFailure({
        error,
        phase: "applied",
        sequence: this.sequence,
      });
      return null;
    }
  }

  private initializeGameSafely(): void {
    if (!this.gameInitCallback || this.gameInitCallbackExecuted) return;
    try {
      this.gameInitCallbackExecuted = this.gameInitCallback();
    } catch (error) {
      this.reportObserverFailure({
        error,
        phase: "initialization",
        sequence: this.sequence,
      });
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
    phase: "applied",
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
  onObserverError: ({ error, phase }) => {
    if (import.meta.env.DEV) {
      console.warn(`[MargonemRuntimeBridge] ${phase} observer failed:`, error);
    }
  },
});
