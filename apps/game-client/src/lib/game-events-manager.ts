type GameEventHandler = (event: any) => void;

class GameEventsManager {
  private eventQueue: any[] = [];
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

  queueEvent(event: any) {
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

    console.log(`Processing ${this.eventQueue.length} queued game events`);

    const events = [...this.eventQueue];
    this.eventQueue = [];

    events.forEach((event) => {
      try {
        this.eventProcessor!(event);
      } catch (error) {
        console.warn("Failed to process queued event:", error);
      }
    });
  }

  setupProxies() {
    this.setupSuccessDataProxies();
    this.setupGameInitProxy();
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
          if (typeof args[0] === "string") {
            try {
              const event = JSON.parse(args[0]);
              this.queueEvent(event);
            } catch (e) {
              console.warn("Failed to process game event:", e);
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

  private setupGameInitProxy() {
    if (this.trySetupGameProxy()) return;

    this.watchForGameInit();
  }

  private trySetupGameProxy(): boolean {
    if (!window._g || typeof window._g !== "function") {
      return false;
    }

    const original = window._g;
    const proxy = new Proxy(original, {
      apply: (target, thisArg, args) => {
        const result = target.apply(thisArg, args);
        this.onGameInitChange();
        return result;
      },
    });

    window._g = proxy;

    this.proxies.push({
      cleanup: () => {
        window._g = original;
      },
    });

    return true;
  }

  private watchForGameInit() {
    this.setupPropertyWatcher();
  }

  private setupPropertyWatcher() {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(window, "_g");
      const self = this;

      Object.defineProperty(window, "_g", {
        get() {
          return descriptor?.value;
        },
        set(value) {
          if (descriptor) {
            descriptor.value = value;
          }

          if (typeof value === "function") {
            setTimeout(() => {
              if (!self.trySetupGameProxy()) {
                console.warn("Game proxy setup failed after _g was set");
              }
            }, 0);
          }
        },
        configurable: true,
        enumerable: true,
      });

      this.proxies.push({
        cleanup: () => {
          if (descriptor) {
            Object.defineProperty(window, "_g", descriptor);
          } else {
            delete (window as any)._g;
          }
        },
      });
    } catch (error) {
      console.warn("Property watcher failed, using backoff retry:", error);
      this.setupBackoffRetry();
    }
  }

  private setupBackoffRetry() {
    let attempts = 0;
    const maxAttempts = 10;
    const baseDelay = 50;

    const retry = () => {
      if (attempts >= maxAttempts) {
        console.warn(
          "Failed to setup game init proxy after",
          maxAttempts,
          "attempts"
        );
        return;
      }

      if (this.trySetupGameProxy()) {
        return;
      }

      attempts++;
      const delay = Math.min(baseDelay * Math.pow(2, attempts), 5000); // Exponential backoff, max 5s
      setTimeout(retry, delay);
    };

    setTimeout(retry, baseDelay);
  }

  private onGameInitChange() {
    if (this.gameInitCallback) {
      this.gameInitCallback();
    }
  }

  private gameInitCallback: (() => void) | null = null;

  setGameInitCallback(callback: () => void) {
    this.gameInitCallback = callback;
  }

  cleanup() {
    this.proxies.forEach((proxy) => proxy.cleanup());
    this.proxies = [];
    this.eventQueue = [];
    this.eventProcessor = null;
    this.isReady = false;
    this.gameInitCallback = null;
  }
}

export const gameEventsManager = new GameEventsManager();
