export const installBrowserEnvironment = ({ gameInterface }) => {
  const instrumentation = {
    audioInstances: 0,
    audioPlays: 0,
    rejectAudioPlays: false,
    bodyObserverCallbacks: 0,
    fetchUrls: [],
    longAnimationFrames: [],
    longTasks: [],
    mutationObserverCallbacks: 0,
    reactCommits: 0,
    socketServerEvents: [],
    storageWriteRecords: [],
    storageWrites: 0,
  };
  window.__lootlogPerfInstrumentation = instrumentation;
  let reactRendererId = 0;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    checkDCE: () => {},
    inject: () => {
      reactRendererId += 1;
      return reactRendererId;
    },
    onCommitFiberRoot: () => {
      instrumentation.reactCommits += 1;
    },
    onCommitFiberUnmount: () => {},
    supportsFiber: true,
  };

  const originalStorageSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function instrumentedStorageSetItem(key, value) {
    instrumentation.storageWrites += 1;
    instrumentation.storageWriteRecords.push({ key, size: value.length });
    return originalStorageSetItem.call(this, key, value);
  };

  const OriginalMutationObserver = window.MutationObserver;
  window.MutationObserver = class InstrumentedMutationObserver {
    constructor(callback) {
      this.observesBody = false;
      this.observer = new OriginalMutationObserver((records, observer) => {
        instrumentation.mutationObserverCallbacks += 1;
        if (this.observesBody) {
          instrumentation.bodyObserverCallbacks += 1;
        }
        callback(records, observer);
      });
    }

    disconnect() {
      this.observer.disconnect();
    }

    observe(target, options) {
      this.observesBody ||= target === document.body;
      this.observer.observe(target, options);
    }

    takeRecords() {
      return this.observer.takeRecords();
    }
  };

  const observePerformanceEntries = (type, destination) => {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) {
      return;
    }

    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        destination.push({
          duration: entry.duration,
          startTime: entry.startTime,
        });
      }
    });
    observer.observe({ buffered: true, type });
  };
  observePerformanceEntries("longtask", instrumentation.longTasks);
  observePerformanceEntries(
    "long-animation-frame",
    instrumentation.longAnimationFrames,
  );

  class InstrumentedAudio extends EventTarget {
    constructor(source = "") {
      super();
      instrumentation.audioInstances += 1;
      this.autoplay = false;
      this.currentTime = 0;
      this.duration = 0;
      this.loop = false;
      this.muted = false;
      this.onended = null;
      this.paused = true;
      this.playbackRate = 1;
      this.preload = "";
      this.preservesPitch = true;
      this.readyState = 4;
      this.src = source;
      this.volume = 1;
    }

    load() {}

    pause() {
      this.paused = true;
    }

    play() {
      instrumentation.audioPlays += 1;
      this.paused = false;
      if (instrumentation.rejectAudioPlays) {
        return Promise.reject(
          new DOMException("Fixture autoplay rejection", "NotAllowedError"),
        );
      }
      return Promise.resolve();
    }

    removeAttribute(name) {
      if (name === "src") {
        this.src = "";
      }
    }
  }
  window.Audio = InstrumentedAudio;

  class SilentWebSocket extends EventTarget {
    static CLOSED = 3;
    static CLOSING = 2;
    static CONNECTING = 0;
    static OPEN = 1;

    constructor(url, protocols) {
      super();
      this.binaryType = "arraybuffer";
      this.bufferedAmount = 0;
      this.extensions = "";
      this.protocol = Array.isArray(protocols) ? (protocols[0] ?? "") : "";
      this.readyState = SilentWebSocket.CONNECTING;
      this.url = String(url);
    }

    close() {
      this.readyState = SilentWebSocket.CLOSED;
      this.dispatchEvent(new CloseEvent("close"));
    }

    send() {}
  }
  window.WebSocket = SilentWebSocket;

  const socketListeners = new Map();
  const socketAnyListeners = new Set();
  let socketConnectionGeneration = 0;
  const emitServerEvent = (event, ...args) => {
    const listeners = socketListeners.get(event) ?? [];
    instrumentation.socketServerEvents.push({
      event,
      listenerCount: listeners.size ?? listeners.length,
    });
    for (const listener of listeners) {
      listener(...args);
    }
    for (const listener of socketAnyListeners) {
      listener(event, ...args);
    }
  };
  const fixtureSocket = {
    auth: {},
    connected: false,
    id: "fixture-socket",
    connect() {
      if (this.connected) {
        return this;
      }

      this.connected = true;
      socketConnectionGeneration += 1;
      const connectionGeneration = socketConnectionGeneration;
      queueMicrotask(() => {
        if (
          this.connected &&
          socketConnectionGeneration === connectionGeneration
        ) {
          emitServerEvent("connect");
        }
      });
      return this;
    },
    disconnect() {
      if (!this.connected) {
        return this;
      }

      this.connected = false;
      socketConnectionGeneration += 1;
      emitServerEvent("disconnect", "fixture disconnect");
      return this;
    },
    emit(event, ...args) {
      if (event === "join") {
        queueMicrotask(() => {
          emitServerEvent("join", {
            guildIds: ["guild-1", "guild-2"],
            guildsCount: 2,
            status: "success",
          });
        });
      }

      const acknowledgement = args.at(-1);
      if (typeof acknowledgement === "function" && event !== "join") {
        queueMicrotask(() => acknowledgement(null, { status: "accepted" }));
      }
      return this;
    },
    emitWithAck() {
      return Promise.resolve({ players: {}, status: "success" });
    },
    hasListeners(event) {
      return (socketListeners.get(event)?.size ?? 0) > 0;
    },
    off(event, listener) {
      socketListeners.get(event)?.delete(listener);
      return this;
    },
    offAny(listener) {
      socketAnyListeners.delete(listener);
      return this;
    },
    on(event, listener) {
      const listeners = socketListeners.get(event) ?? new Set();
      listeners.add(listener);
      socketListeners.set(event, listeners);
      return this;
    },
    onAny(listener) {
      socketAnyListeners.add(listener);
      return this;
    },
    removeAllListeners() {
      socketListeners.clear();
      socketAnyListeners.clear();
      return this;
    },
    serverEmit: emitServerEvent,
    timeout() {
      return this;
    },
  };
  window.__lootlogPerfSocket = fixtureSocket;

  const hero = {
    account: 101,
    clan: { id: 11, name: "Fixture Guild", rank: 1 },
    createStrTip: () => "",
    id: 202,
    img: "fixture-hero.gif",
    lvl: 150,
    nick: "FixtureHero",
    prof: "w",
    updateTip: () => {},
    x: 5,
    y: 7,
  };
  const map = {
    id: 303,
    name: "Fixture map",
    pvp: 0,
    x: 32,
    y: 32,
  };
  const successData = (payload) => payload;

  window.API = {
    addCallbackToEvent: () => {},
    removeCallbackFromEvent: () => {},
  };
  window._g = () => {};
  window.getCookie = (name) => {
    if (name === "interface") {
      return gameInterface;
    }
    if (name === "hs3") {
      return "fixture-hs3";
    }
    return null;
  };
  window.getZoomFactor = () => 1;
  window.message = () => {};
  window.successData = successData;

  if (gameInterface === "ni") {
    window.Engine = {
      apiData: { CALL_DRAW_ADD_TO_RENDERER: "fixture-draw" },
      canvasTip: { hide: () => {}, show: () => {} },
      communication: { successData },
      hero: { ...hero, d: hero },
      interface: {
        alreadyInitialised: true,
        getAlreadyInitialised: () => true,
      },
      map: { d: map },
      miniMapController: {},
      npcIconManager: { getNpcIcon: () => "" },
      npcTplManager: { getNpcTpl: () => undefined },
      npcs: {
        getById: () => undefined,
        getDrawableList: () => [],
      },
      others: { check: () => ({}) },
      party: { getMembers: () => new Map() },
      renderer: { getHighestOrderWithoutSort: () => 10 },
      worldConfig: { getWorldName: () => "fixture" },
    };
  } else {
    window.g = {
      init: 5,
      npc: {},
      npcIconManager: { getNpcIcon: () => "" },
      npcTplManager: { getNpcTpl: () => undefined },
      other: {},
      worldConfig: { getWorldName: () => "fixture" },
    };
    window.hero = hero;
    window.map = map;
  }

  const notifications = {
    ELITE2: {
      autoHideTimeout: 0,
      guildIds: ["guild-1", "guild-2"],
      highlight: false,
      ignoreOtherWorlds: false,
      show: false,
      sound: false,
    },
    HERO: {
      autoHideTimeout: 0,
      guildIds: ["guild-1", "guild-2"],
      highlight: true,
      ignoreOtherWorlds: false,
      show: true,
      sound: false,
    },
    COLOSSUS: {
      autoHideTimeout: 0,
      guildIds: ["guild-1", "guild-2"],
      highlight: true,
      ignoreOtherWorlds: false,
      show: true,
      sound: false,
    },
    TITAN: {
      autoHideTimeout: 0,
      guildIds: ["guild-1", "guild-2"],
      highlight: true,
      ignoreOtherWorlds: false,
      show: true,
      sound: false,
    },
    message: {
      autoHideTimeout: 0,
      guildIds: ["guild-1", "guild-2"],
      highlight: true,
      ignoreOtherWorlds: false,
      show: true,
      sound: false,
    },
    "party-gathering": {
      autoHideTimeout: 0,
      guildIds: ["guild-1", "guild-2"],
      highlight: true,
      ignoreOtherWorlds: false,
      show: true,
      sound: false,
    },
  };
  const accountPreferences = {
    accountId: String(hero.account),
    airTags: { enabled: false },
    detector: {
      COLOSSUS: { autoSend: false, detect: false, notifyWindow: false },
      ELITE2: { autoSend: false, detect: false, notifyWindow: false },
      HERO: { autoSend: false, detect: false, notifyWindow: false },
      TITAN: { autoSend: false, detect: false, notifyWindow: false },
      routingRules: [],
    },
    hasStoredAirTags: true,
    hasStoredDetector: true,
    hasStoredNotifications: true,
    hasStoredPings: true,
    hasStoredPreferences: true,
    notifications,
    pings: { enabled: false },
  };
  const now = new Date().toISOString();
  const soundSettings = {
    createdAt: now,
    detectorConfig: {},
    detectorVolume: 0,
    masterVolume: 1,
    notificationsConfig: {},
    notificationsVolume: 1,
    pingsVolume: 0,
    timersConfig: {},
    timersVolume: 0,
    updatedAt: now,
    userId: "fixture-user",
  };

  window.fetch = (input) => {
    let url;
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else if (input instanceof Request) {
      url = input.url;
    } else {
      url = String(input);
    }
    instrumentation.fetchUrls.push(url);
    let payload = [];

    if (url.includes("/game-preferences/accounts/")) {
      payload = accountPreferences;
    } else if (url.includes("/timer-settings")) {
      payload = {
        alwaysVisibleExpiredTimers: {},
        colorFiltersEnabled: false,
        createdAt: now,
        customColors: {},
        defaultColorNames: {},
        displayConfig: {
          fontSize: 11,
          minColumnWidth: 120,
          showLevel: false,
          showType: true,
          singleTimerDisplayMode: "row",
        },
        generalConfig: {
          compactView: false,
          countdownMode: "max",
          removeTimerAfterMs: 30000,
          timersGrouping: false,
          timersUnderBag: false,
        },
        hiddenDefaultColors: [],
        overriddenDefaultColors: {},
        syncEnabled: true,
        timerFiltersEnabled: false,
        timersColors: {},
        timersSortOrder: "asc",
        updatedAt: now,
        userId: "fixture-user",
      };
    } else if (url.includes("/sound-settings")) {
      payload = soundSettings;
    } else if (url.includes("/users/@me/preferences")) {
      payload = {
        colorMode: "dark",
        guildsOrder: ["guild-1", "guild-2"],
        mutes: { npcs: [], players: [] },
        theme: "dark",
        userId: "fixture-user",
      };
    } else if (url.includes("/users/@me/guilds/accessible")) {
      payload = [
        {
          hasLootlogAccess: true,
          icon: null,
          id: "guild-1",
          isAccessDataStale: false,
          name: "Fixture Guild",
          ownerId: "fixture-user",
          publicStatsCardEnabled: true,
          vanityUrl: null,
        },
        {
          hasLootlogAccess: true,
          icon: null,
          id: "guild-2",
          isAccessDataStale: false,
          name: "Second Fixture Guild",
          ownerId: "fixture-user",
          publicStatsCardEnabled: true,
          vanityUrl: null,
        },
      ];
    } else if (url.includes("/members/summary")) {
      payload = [];
    } else if (url.includes("/messaging/party-gathering")) {
      payload = [];
    } else if (url.includes("/event-mode")) {
      payload = { events: [] };
    } else if (url.includes("/idp/get-session")) {
      payload = {
        session: {
          createdAt: now,
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          id: "fixture-session",
          token: "fixture-token",
          updatedAt: now,
          userId: "fixture-user",
        },
        user: {
          createdAt: now,
          discordId: "fixture-discord",
          email: "fixture@example.com",
          emailVerified: true,
          id: "fixture-user",
          image: null,
          name: "Fixture User",
          updatedAt: now,
        },
      };
    }

    return Promise.resolve(
      new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
  };

  const closedWindow = (width, height, extra = {}) => ({
    hasDefinedPosition: true,
    locked: false,
    opacity: 4,
    open: false,
    position: { x: 20, y: 20 },
    size: { height, width },
    ...extra,
  });
  const persistedWindows = {
    state: {
      chat: closedWindow(360, 300, { autofocus: false }),
      "event-mode": closedWindow(290, 132),
      notifications: closedWindow(360, 600, { maxContentHeight: 560 }),
      "quick-access": closedWindow(250, 56),
      timers: closedWindow(242, 240),
    },
    version: 10,
  };
  localStorage.setItem("ll-windows-state", JSON.stringify(persistedWindows));

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      document.body.classList.toggle("si", gameInterface === "si");
    },
    { once: true },
  );
};
