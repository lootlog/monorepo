import type { GameEvent } from "@lootlog/margonem/game-events";

type GameEventHandler = (event: GameEvent) => void;
type GameEventSubscription = () => void;
type RawGameEventPayload = string | GameEvent;
type SuccessDataHandler = (...args: unknown[]) => unknown;
type SuccessDataContainer = {
  successData?: SuccessDataHandler;
};
type ProxyRegistration = {
  active: boolean;
  container: SuccessDataContainer;
  original: SuccessDataHandler;
  proxy: SuccessDataHandler;
};
type WarningState = {
  lastEmittedAt: number;
  suppressedCount: number;
};
type FatalPipelineHandler = () => void;
type RuntimeWindow = Window & {
  __lootlogGameClientRuntime?: { dispose: () => void };
};

export const MAX_QUEUED_GAME_EVENTS = 1_000;
export const MAX_QUEUED_GAME_EVENT_RAW_BYTES = 2 * 1024 * 1024;

const WARNING_INTERVAL_MS = 10_000;
const EMPTY_SUBSCRIPTION = () => undefined;

class GameEventsManager {
  private eventQueue: GameEvent[] = [];
  private eventQueueRawBytes = 0;
  private eventProcessor: GameEventHandler | null = null;
  private afterGameEventHandlers = new Set<GameEventHandler>();
  private isReady = false;
  private proxies: ProxyRegistration[] = [];
  private stripFriendsFromNextEvent = false;
  private activeProxyRegistrations: ProxyRegistration[] = [];
  private activeProxyPayloads: unknown[] = [];
  private pipelineEnabled = true;
  private warningStates = new Map<string, WarningState>();

  constructor(private readonly onFatalPipelineError?: FatalPipelineHandler) {}

  markStripFriendsFromNextEvent() {
    if (!this.pipelineEnabled) {
      return;
    }

    this.stripFriendsFromNextEvent = true;
  }

  private readonly FRIENDS_KEYS_TO_STRIP = [
    "friends",
    "friends_max",
    "enemies",
    "enemies_max",
  ] as const;

  private stripFriendsKeys(event: GameEvent): GameEvent {
    if (!this.stripFriendsFromNextEvent) {
      return event;
    }

    const hasFriendsKey = this.FRIENDS_KEYS_TO_STRIP.some(
      (key) => event[key] !== undefined,
    );

    if (!hasFriendsKey) {
      return event;
    }

    this.stripFriendsFromNextEvent = false;

    const strippedEvent = { ...event };
    for (const key of this.FRIENDS_KEYS_TO_STRIP) {
      delete strippedEvent[key];
    }

    return strippedEvent;
  }

  setProcessor(processor: GameEventHandler) {
    if (!this.pipelineEnabled) {
      return;
    }

    this.eventProcessor = processor;
    this.processQueue();
  }

  removeProcessor() {
    this.eventProcessor = null;
  }

  subscribeAfterGameEvent(handler: GameEventHandler): GameEventSubscription {
    if (!this.pipelineEnabled) {
      return EMPTY_SUBSCRIPTION;
    }

    this.afterGameEventHandlers.add(handler);

    return () => {
      this.afterGameEventHandlers.delete(handler);
    };
  }

  triggerManualEvent(event: GameEvent): boolean {
    if (!this.pipelineEnabled) {
      this.warnRateLimited(
        "manual-event-disabled",
        "Game event pipeline is disabled; manual event was ignored",
      );
      return false;
    }

    if (!import.meta.env.DEV) {
      this.warnRateLimited(
        "manual-event-production",
        "Manual event triggering is only available in development mode",
      );
      return false;
    }

    if (!this.eventProcessor) {
      this.warnRateLimited(
        "manual-event-not-ready",
        "Event processor not ready",
      );
      return false;
    }

    try {
      this.eventProcessor(event);
      return true;
    } catch (error) {
      this.warnRateLimited(
        "manual-event-processor",
        "Failed to trigger manual event",
        error,
      );
      return false;
    }
  }

  setReady(ready: boolean) {
    if (!this.pipelineEnabled) {
      return;
    }

    this.isReady = ready;
    if (ready) {
      this.processQueue();
    }
  }

  queueEvent(event: GameEvent, rawBytes = 0): boolean {
    if (!this.pipelineEnabled) {
      return false;
    }

    if (this.isReady && this.eventProcessor) {
      try {
        this.eventProcessor(event);
      } catch (error) {
        this.warnRateLimited(
          "event-processor",
          "Failed to process game event",
          error,
        );
      }

      return true;
    }

    if (
      this.eventQueue.length >= MAX_QUEUED_GAME_EVENTS ||
      this.eventQueueRawBytes + rawBytes > MAX_QUEUED_GAME_EVENT_RAW_BYTES
    ) {
      this.disablePipelineDueToQueueOverflow();
      return false;
    }

    this.eventQueue.push(event);
    this.eventQueueRawBytes += rawBytes;
    return true;
  }

  private processQueue() {
    if (!this.isReady || !this.eventProcessor || this.eventQueue.length === 0) {
      return;
    }

    const events = this.eventQueue;
    this.eventQueue = [];
    this.eventQueueRawBytes = 0;

    for (const event of events) {
      try {
        this.eventProcessor?.(event);
      } catch (error) {
        this.warnRateLimited(
          "queued-event-processor",
          "Failed to process queued game event",
          error,
        );
      }
    }
  }

  setupProxies() {
    if (!this.pipelineEnabled) {
      return;
    }

    this.setupSuccessDataProxies();
  }

  private setupSuccessDataProxies() {
    const proxyTargets: Array<{
      container: SuccessDataContainer | undefined;
      property: "successData";
    }> = [
      {
        container: window as Window & SuccessDataContainer,
        property: "successData",
      },
      {
        container: window.Engine?.communication as SuccessDataContainer,
        property: "successData",
      },
    ];

    for (const { container, property } of proxyTargets) {
      if (!container) {
        continue;
      }

      const originalSuccessData = container[property];
      if (!originalSuccessData) {
        continue;
      }

      const alreadyInstalled = this.proxies.some(
        (registration) =>
          registration.container === container &&
          container[property] === registration.proxy,
      );

      if (alreadyInstalled) {
        continue;
      }

      const registration: ProxyRegistration = {
        active: true,
        container,
        original: originalSuccessData,
        proxy: originalSuccessData,
      };
      const proxiedSuccessData = new Proxy(originalSuccessData, {
        apply: (target, thisArg, args) => {
          if (!registration.active) {
            return Reflect.apply(target, thisArg, args);
          }

          if (this.isForwardedProxyInvocation(registration, args[0])) {
            return Reflect.apply(target, thisArg, args);
          }

          const activeInvocationIndex = this.activeProxyRegistrations.length;
          this.activeProxyRegistrations.push(registration);
          this.activeProxyPayloads.push(args[0]);

          try {
            let forwardedArgs = args;
            let parsedEvent: GameEvent | null = null;

            if (this.pipelineEnabled) {
              try {
                this.onGameInitChange();
                ({ forwardedArgs, parsedEvent } =
                  this.buildForwardedSuccessDataArgs(args));
              } catch (error) {
                this.warnRateLimited(
                  "proxy-pipeline",
                  "Failed to prepare a game event; forwarding it unchanged",
                  error,
                );
              }
            }

            this.activeProxyPayloads[activeInvocationIndex] = forwardedArgs[0];
            const result = Reflect.apply(target, thisArg, forwardedArgs);

            if (parsedEvent && registration.active && this.pipelineEnabled) {
              this.emitAfterGameEvent(parsedEvent);
            }

            return result;
          } finally {
            this.activeProxyRegistrations.pop();
            this.activeProxyPayloads.pop();
          }
        },
      });
      registration.proxy = proxiedSuccessData;

      try {
        container[property] = proxiedSuccessData;
      } catch (error) {
        registration.active = false;
        this.warnRateLimited(
          "proxy-install",
          "Failed to install a game event proxy",
          error,
        );
        continue;
      }

      if (container[property] !== proxiedSuccessData) {
        registration.active = false;
        this.warnRateLimited(
          "proxy-install",
          "Failed to install a game event proxy",
        );
        continue;
      }

      this.proxies.push(registration);
    }
  }

  private buildForwardedSuccessDataArgs(args: unknown[]): {
    forwardedArgs: unknown[];
    parsedEvent: GameEvent | null;
  } {
    const parsedEvent = this.parseGameEventPayload(args[0]);
    if (!parsedEvent) {
      return { forwardedArgs: args, parsedEvent: null };
    }

    const rawBytes =
      typeof args[0] === "string" ? this.getUtf8ByteLength(args[0]) : 0;
    if (!this.queueEvent(parsedEvent, rawBytes)) {
      return { forwardedArgs: args, parsedEvent: null };
    }

    const strippedEvent = this.stripFriendsKeys(parsedEvent);
    if (strippedEvent === parsedEvent) {
      return { forwardedArgs: args, parsedEvent };
    }

    return {
      forwardedArgs: [
        this.serializeGameEventPayload(args[0], strippedEvent),
        ...args.slice(1),
      ],
      parsedEvent: strippedEvent,
    };
  }

  private emitAfterGameEvent(event: GameEvent): void {
    for (const handler of this.afterGameEventHandlers) {
      try {
        handler(event);
      } catch (error) {
        this.warnRateLimited(
          "after-game-event",
          "Failed to process after-game event",
          error,
        );
      }
    }
  }

  private parseGameEventPayload(payload: unknown): GameEvent | null {
    if (typeof payload === "string") {
      try {
        return JSON.parse(payload) as GameEvent;
      } catch (error) {
        this.warnRateLimited(
          "event-payload-parse",
          "Failed to parse game event payload",
          error,
        );
        return null;
      }
    }

    if (payload && typeof payload === "object") {
      return payload as GameEvent;
    }

    return null;
  }

  private serializeGameEventPayload(
    originalPayload: unknown,
    event: GameEvent,
  ): RawGameEventPayload {
    if (typeof originalPayload === "string") {
      return JSON.stringify(event);
    }

    return event;
  }

  private getUtf8ByteLength(value: string): number {
    let byteLength = 0;

    for (let index = 0; index < value.length; index += 1) {
      const codeUnit = value.charCodeAt(index);
      if (codeUnit < 0x80) {
        byteLength += 1;
      } else if (codeUnit < 0x800) {
        byteLength += 2;
      } else if (
        codeUnit >= 0xd800 &&
        codeUnit <= 0xdbff &&
        index + 1 < value.length &&
        value.charCodeAt(index + 1) >= 0xdc00 &&
        value.charCodeAt(index + 1) <= 0xdfff
      ) {
        byteLength += 4;
        index += 1;
      } else {
        byteLength += 3;
      }
    }

    return byteLength;
  }

  private gameInitCallbackExecuted = false;

  private onGameInitChange() {
    if (this.gameInitCallback && !this.gameInitCallbackExecuted) {
      const result = this.gameInitCallback();

      if (result) {
        this.gameInitCallbackExecuted = true;
      }
    }
  }

  private gameInitCallback: (() => boolean) | null = null;

  setGameInitCallback(callback: () => boolean) {
    if (!this.pipelineEnabled) {
      return;
    }

    this.gameInitCallback = callback;
    this.gameInitCallbackExecuted = false;
  }

  private disablePipelineDueToQueueOverflow(): void {
    this.pipelineEnabled = false;
    this.eventQueue = [];
    this.eventQueueRawBytes = 0;
    this.eventProcessor = null;
    this.afterGameEventHandlers.clear();
    this.isReady = false;
    this.stripFriendsFromNextEvent = false;
    this.gameInitCallback = null;
    this.gameInitCallbackExecuted = false;
    this.detachProxies();
    this.warnRateLimited(
      "queue-overflow",
      "Game event pipeline disabled after its startup queue reached the safety limit",
      {
        maxQueuedEvents: MAX_QUEUED_GAME_EVENTS,
        maxQueuedRawBytes: MAX_QUEUED_GAME_EVENT_RAW_BYTES,
      },
    );
    this.onFatalPipelineError?.();
  }

  private isForwardedProxyInvocation(
    registration: ProxyRegistration,
    payload: unknown,
  ): boolean {
    for (
      let index = 0;
      index < this.activeProxyRegistrations.length;
      index += 1
    ) {
      const activeRegistration = this.activeProxyRegistrations[index];

      if (
        activeRegistration.active &&
        activeRegistration !== registration &&
        this.activeProxyPayloads[index] === payload
      ) {
        return true;
      }
    }

    return false;
  }

  private warnRateLimited(
    key: string,
    message: string,
    detail?: unknown,
  ): void {
    const now = Date.now();
    const warningState = this.warningStates.get(key);

    if (
      warningState &&
      now - warningState.lastEmittedAt < WARNING_INTERVAL_MS
    ) {
      warningState.suppressedCount += 1;
      return;
    }

    const suppressedSuffix = warningState?.suppressedCount
      ? ` (${warningState.suppressedCount} similar warnings suppressed)`
      : "";
    const warningMessage = `${message}${suppressedSuffix}`;

    if (detail === undefined) {
      console.warn(warningMessage);
    } else {
      console.warn(warningMessage, detail);
    }

    this.warningStates.set(key, {
      lastEmittedAt: now,
      suppressedCount: 0,
    });
  }

  private detachProxies(): void {
    for (const registration of this.proxies) {
      registration.active = false;
    }

    for (let index = this.proxies.length - 1; index >= 0; index -= 1) {
      const registration = this.proxies[index];

      if (registration.container.successData === registration.proxy) {
        try {
          registration.container.successData = registration.original;
        } catch (error) {
          this.warnRateLimited(
            "proxy-cleanup",
            "Failed to restore a game event handler",
            error,
          );
        }
      }
    }

    this.proxies = [];
  }

  cleanup() {
    this.detachProxies();
    this.eventQueue = [];
    this.eventQueueRawBytes = 0;
    this.eventProcessor = null;
    this.afterGameEventHandlers.clear();
    this.isReady = false;
    this.gameInitCallback = null;
    this.gameInitCallbackExecuted = false;
    this.stripFriendsFromNextEvent = false;
    this.pipelineEnabled = true;
    this.warningStates.clear();
  }
}

function scheduleActiveRuntimeTeardown(): void {
  const runtimeWindow = window as RuntimeWindow;
  const failedRuntime = runtimeWindow.__lootlogGameClientRuntime;
  if (!failedRuntime) {
    return;
  }

  queueMicrotask(() => {
    if (runtimeWindow.__lootlogGameClientRuntime === failedRuntime) {
      failedRuntime.dispose();
    }
  });
}

export const gameEventsManager = new GameEventsManager(
  scheduleActiveRuntimeTeardown,
);
