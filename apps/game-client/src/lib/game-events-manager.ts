import type { GameEvent } from "@/types/margonem/game-events/game-event";

type GameEventHandler = (event: GameEvent) => void;
type RawGameEventPayload = string | GameEvent;

class GameEventsManager {
  private eventQueue: GameEvent[] = [];
  private eventProcessor: GameEventHandler | null = null;
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
    const targets: Array<{ obj: any; prop: string }> = [
      { obj: window, prop: "successData" },
      { obj: window.Engine?.communication, prop: "successData" },
    ];

    targets.forEach(({ obj, prop }) => {
      if (!obj || !obj[prop]) return;

      const original = obj[prop] as Function;
      const proxy = new Proxy(original, {
        apply: (target, thisArg, args) => {
          this.onGameInitChange();

          let modifiedArgs = args;
          const parsedEvent = this.parseGameEventPayload(args[0]);

          if (parsedEvent) {
            this.queueEvent(parsedEvent);

            const strippedEvent = this.stripFriendsKeys(parsedEvent);
            if (strippedEvent !== parsedEvent) {
              modifiedArgs = [
                this.serializeGameEventPayload(args[0], strippedEvent),
                ...args.slice(1),
              ];
            }
          }

          return target.apply(thisArg, modifiedArgs);
        },
      });

      (obj as any)[prop] = proxy;

      this.proxies.push({
        cleanup: () => {
          (obj as any)[prop] = original;
        },
      });
    });
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
    this.isReady = false;
    this.gameInitCallback = null;
    this.gameInitCallbackExecuted = false;
    this.stripFriendsFromNextEvent = false;
  }
}

export const gameEventsManager = new GameEventsManager();
