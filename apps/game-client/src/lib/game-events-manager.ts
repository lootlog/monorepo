import type { GameEvent } from "@/types/margonem/game-events/game-event";

type GameEventHandler = (event: GameEvent) => void;

class GameEventsManager {
  private eventQueue: GameEvent[] = [];
  private eventProcessor: GameEventHandler | null = null;
  private isReady = false;
  private proxies: Array<{ cleanup: () => void }> = [];

  setProcessor(processor: GameEventHandler) {
    this.eventProcessor = processor;
    this.processQueue();
  }

  removeProcessor() {
    this.eventProcessor = null;
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

          if (typeof args[0] === "string") {
            try {
              const event = JSON.parse(args[0]);
              this.queueEvent(event);
            } catch (error) {
              console.warn("Failed to process game event:", error);
            }
          }

          const result = target.apply(thisArg, args);

          return result;
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
  }
}

export const gameEventsManager = new GameEventsManager();
