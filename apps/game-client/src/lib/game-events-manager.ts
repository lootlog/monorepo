import type { GameEvent } from "@lootlog/margonem/game-events";

type GameEventHandler = (event: GameEvent) => void;
type GameEventSubscription = () => void;
type RawGameEventPayload = string | GameEvent;
type SuccessDataHandler = (...args: unknown[]) => unknown;
type SuccessDataContainer = {
  successData?: SuccessDataHandler;
};

class GameEventsManager {
  private eventQueue: GameEvent[] = [];
  private eventProcessor: GameEventHandler | null = null;
  private afterGameEventHandlers = new Set<GameEventHandler>();
  private isReady = false;
  private proxies: Array<{ cleanup: () => void }> = [];
  private stripFriendsFromNextEvent = false;

  markStripFriendsFromNextEvent() {
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
    this.eventProcessor = processor;
    this.processQueue();
  }

  removeProcessor() {
    this.eventProcessor = null;
  }

  subscribeAfterGameEvent(handler: GameEventHandler): GameEventSubscription {
    this.afterGameEventHandlers.add(handler);

    return () => {
      this.afterGameEventHandlers.delete(handler);
    };
  }

  triggerManualEvent(event: GameEvent): boolean {
    if (!import.meta.env.DEV) {
      console.warn(
        "Manual event triggering is only available in development mode",
      );
      return false;
    }

    if (!this.eventProcessor) {
      console.warn("Event processor not ready");
      return false;
    }

    try {
      this.eventProcessor(event);
      return true;
    } catch (error) {
      console.error("Failed to trigger manual event:", error);
      return false;
    }
  }

  setReady(ready: boolean) {
    this.isReady = ready;
    if (ready) {
      this.processQueue();
    }
  }

  queueEvent(event: GameEvent) {
    if (this.isReady && this.eventProcessor) {
      try {
        this.eventProcessor(event);
      } catch (error) {
        console.warn("Failed to process game event:", error);
      }
    } else {
      this.eventQueue.push(event);
    }
  }

  private processQueue() {
    if (!this.isReady || !this.eventProcessor || this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    events.forEach((event) => {
      try {
        this.eventProcessor?.(event);
      } catch (error) {
        console.warn("Failed to process queued event:", error);
      }
    });
  }

  setupProxies() {
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

      const proxiedSuccessData = new Proxy(originalSuccessData, {
        apply: (target, thisArg, args) => {
          this.onGameInitChange();

          const { forwardedArgs, parsedEvent } =
            this.buildForwardedSuccessDataArgs(args);
          const result = target.apply(thisArg, forwardedArgs);

          if (parsedEvent) {
            this.emitAfterGameEvent(parsedEvent);
          }

          return result;
        },
      });

      container[property] = proxiedSuccessData;

      this.proxies.push({
        cleanup: () => {
          container[property] = originalSuccessData;
        },
      });
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

    this.queueEvent(parsedEvent);

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
        console.warn("Failed to process after-game event:", error);
      }
    }
  }

  private parseGameEventPayload(payload: unknown): GameEvent | null {
    if (typeof payload === "string") {
      try {
        return JSON.parse(payload) as GameEvent;
      } catch (error) {
        console.warn("Failed to process game event:", error);
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
    this.gameInitCallback = callback;
    this.gameInitCallbackExecuted = false;
  }

  cleanup() {
    this.proxies.forEach((proxy) => proxy.cleanup());
    this.proxies = [];
    this.eventQueue = [];
    this.eventProcessor = null;
    this.afterGameEventHandlers.clear();
    this.isReady = false;
    this.gameInitCallback = null;
    this.gameInitCallbackExecuted = false;
    this.stripFriendsFromNextEvent = false;
  }
}

export const gameEventsManager = new GameEventsManager();
