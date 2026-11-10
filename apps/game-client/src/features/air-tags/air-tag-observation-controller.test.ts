import {
  AIR_TAG_MAP_THREAT_FRESH_MS,
  type AirTagObservationBatch,
} from "@lootlog/schema/air-tag";
import type { Other, OtherCreate } from "@lootlog/margonem/game-events";
import {
  AIR_TAG_BATCH_INTERVAL_MS,
  AIR_TAG_HEARTBEAT_INTERVAL_MS,
  AirTagObservationController,
} from "./air-tag-observation-controller";
import {
  setTestRuntimeGame,
  testRuntimeWindow,
} from "@/test/test-runtime-window";

beforeEach(() => setTestRuntimeGame());

const createOther = (overrides: Partial<OtherCreate> = {}): OtherCreate => ({
  action: "CREATE",
  account: 10,
  nick: "Target",
  icon: "target.gif",
  x: 10,
  y: 10,
  dir: 0,
  stasis: 0,
  stasis_incoming_seconds: 0,
  rights: 0,
  lvl: 300,
  oplvl: 300,
  prof: "w",
  attr: 0,
  is_blessed: 0,
  relation: 1,
  ...overrides,
});

describe("AirTagObservationController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    testRuntimeWindow.Engine = {
      hero: { d: { id: 999 } },
      others: { check: vi.fn<() => Record<string, never>>(() => ({})) },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("batches CREATE and significant movement but ignores small movement", () => {
    const publisher = vi.fn<(batch: AirTagObservationBatch) => void>();
    const controller = new AirTagObservationController();
    controller.configure({
      enabled: true,
      canPublish: true,
      mapId: 42,
      publisher,
    });

    controller.handle({ "123": createOther() });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    expect(publisher).toHaveBeenLastCalledWith({
      expectedMapId: 42,
      observations: [
        expect.objectContaining({
          targetId: "123",
          nickname: "Target",
          x: 10,
          y: 10,
        }),
      ],
    });

    controller.handle({ "123": { x: 11, y: 10, dir: 1 } });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    expect(publisher).toHaveBeenCalledTimes(1);

    controller.handle({ "123": { x: 12, y: 10, dir: 1 } });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    expect(publisher).toHaveBeenCalledTimes(2);
    expect(publisher).toHaveBeenLastCalledWith({
      expectedMapId: 42,
      observations: [expect.objectContaining({ x: 12, y: 10 })],
    });
  });

  it("tells a player who left the map from one who left the hero's sight, reporting only players the gateway knew", () => {
    setTestRuntimeGame({
      hero: { x: 10, y: 10 },
      map: { id: 42, name: "Ithan", visibility: 12 },
    });
    const publisher = vi.fn<(batch: AirTagObservationBatch) => void>();
    const onLeftMap = vi.fn<(targetId: string) => void>();
    const controller = new AirTagObservationController();
    controller.configure({
      enabled: true,
      canPublish: true,
      mapId: 42,
      publisher,
      onLeftMap,
    });

    controller.handle({
      near: createOther({ x: 14, y: 13 }),
      edge: createOther({ x: 20, y: 16 }),
    });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    // Leaves before its first batch went out.
    controller.handle({ unsent: createOther({ x: 11, y: 10 }) });
    controller.handle({
      near: { del: 1 },
      edge: { del: 1 },
      unsent: { del: 1 },
    });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);

    expect(publisher).toHaveBeenLastCalledWith({
      expectedMapId: 42,
      observations: [],
      departures: [
        { targetId: "near", reason: "left-map" },
        { targetId: "edge", reason: "out-of-sight" },
      ],
    });
    expect(onLeftMap.mock.calls).toEqual([["near"], ["unsent"]]);

    // Without war shadow the game knows every player on the map.
    setTestRuntimeGame({
      hero: { x: 10, y: 10 },
      map: { id: 42, name: "Ithan", visibility: 0 },
    });
    controller.handle({ far: createOther({ x: 90, y: 90 }) });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    controller.handle({ far: { del: 1 } });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);

    expect(publisher).toHaveBeenLastCalledWith({
      expectedMapId: 42,
      observations: [],
      departures: [{ targetId: "far", reason: "left-map" }],
    });
  });

  it("publishes a stationary target heartbeat before the server TTL", () => {
    const publisher = vi.fn<(batch: AirTagObservationBatch) => void>();
    const controller = new AirTagObservationController();
    controller.configure({
      enabled: true,
      canPublish: true,
      mapId: 42,
      publisher,
    });
    controller.handle({ "123": createOther() });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);

    vi.advanceTimersByTime(
      AIR_TAG_HEARTBEAT_INTERVAL_MS - AIR_TAG_BATCH_INTERVAL_MS,
    );
    expect(publisher).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);

    expect(publisher).toHaveBeenCalledTimes(2);
    expect(publisher).toHaveBeenLastCalledWith({
      expectedMapId: 42,
      observations: [expect.objectContaining({ targetId: "123" })],
    });
  });

  it("keeps a stationary target's reports closer together than the freshness window", () => {
    const publishedAt: number[] = [];
    const controller = new AirTagObservationController();
    controller.configure({
      enabled: true,
      canPublish: true,
      mapId: 42,
      publisher: () => publishedAt.push(Date.now()),
    });
    controller.handle({ "123": createOther() });

    for (let elapsed = 0; elapsed < 30_000; elapsed += 100) {
      vi.advanceTimersByTime(100);
    }

    // The heartbeat, its scan granularity and the batch window bound the gap
    // between two reports of a target that never moves; it settles at the
    // heartbeat itself. Once that bound reaches the window the gateway keeps a
    // target in, the target expires and silently leaves every observer's map,
    // so the three constants spend one budget rather than standing on their own.
    const gaps = publishedAt
      .slice(1)
      .map((at, index) => at - publishedAt[index]!);

    expect(publishedAt.length).toBeGreaterThan(4);
    expect(Math.max(...gaps)).toBeLessThan(AIR_TAG_MAP_THREAT_FRESH_MS);
  });

  it("reports stasis from a partial update at once, keeps the profession, and ends stasis on the next small step", () => {
    const publisher = vi.fn<(batch: AirTagObservationBatch) => void>();
    const controller = new AirTagObservationController();
    controller.configure({
      enabled: true,
      canPublish: true,
      mapId: 42,
      publisher,
    });
    controller.handle({ "123": createOther({ lvl: 250 }) });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    expect(publisher).toHaveBeenLastCalledWith({
      expectedMapId: 42,
      observations: [
        expect.objectContaining({ lvl: 250, prof: "w", stasis: false }),
      ],
    });

    // A partial update omits the profession; the observation keeps it.
    controller.handle({ "123": { stasis: 1 } });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    expect(publisher).toHaveBeenCalledTimes(2);
    expect(publisher).toHaveBeenLastCalledWith({
      expectedMapId: 42,
      observations: [expect.objectContaining({ prof: "w", stasis: true })],
    });

    // Margonem sends no `stasis: 0` when a player in stasis moves.
    controller.handle({ "123": { x: 11, y: 10, dir: 1 } });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    expect(publisher).toHaveBeenCalledTimes(3);
    expect(publisher).toHaveBeenLastCalledWith({
      expectedMapId: 42,
      observations: [expect.objectContaining({ x: 11, stasis: false })],
    });
  });

  it("stops heartbeats after del and cancels pending data on map change", () => {
    const publisher = vi.fn<(batch: AirTagObservationBatch) => void>();
    const controller = new AirTagObservationController();
    controller.configure({
      enabled: true,
      canPublish: true,
      mapId: 42,
      publisher,
    });
    controller.handle({ "123": createOther() });
    controller.handle({ "123": { del: 1 } });
    vi.advanceTimersByTime(AIR_TAG_HEARTBEAT_INTERVAL_MS * 2);
    expect(publisher).not.toHaveBeenCalled();

    controller.handle({ "456": createOther({ nick: "Second" }) });
    controller.resetForMap(99);
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    expect(publisher).not.toHaveBeenCalled();
  });

  it("republishes a relation or clan that changes mid-session and ignores a malformed one", () => {
    const publisher = vi.fn<(batch: AirTagObservationBatch) => void>();
    const controller = new AirTagObservationController();
    controller.configure({
      enabled: true,
      canPublish: true,
      mapId: 42,
      publisher,
    });
    controller.handle({ "123": createOther({ relation: 1 }) });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);

    // A clan war declared while both players stay on the map.
    controller.handle({
      "123": { relation: 6, clan: { id: 7, name: "Rivals" } },
    });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    expect(publisher).toHaveBeenLastCalledWith({
      expectedMapId: 42,
      observations: [
        expect.objectContaining({
          relation: 6,
          clan: { id: 7, name: "Rivals" },
        }),
      ],
    });

    controller.handle({ "123": { relation: 99 } });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    expect(publisher).toHaveBeenCalledTimes(2);
  });

  it("forgets targets on a reload so players who left meanwhile stop sending heartbeats", () => {
    const publisher = vi.fn<(batch: AirTagObservationBatch) => void>();
    const controller = new AirTagObservationController();
    controller.configure({
      enabled: true,
      canPublish: true,
      mapId: 42,
      publisher,
    });
    controller.handle({ "123": createOther() });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);

    controller.forgetTargets();
    controller.handle({ "456": createOther({ nick: "Stayed" }) });
    vi.advanceTimersByTime(AIR_TAG_HEARTBEAT_INTERVAL_MS * 2);
    expect(
      publisher.mock.calls
        .slice(1)
        .flatMap(([batch]) => batch.observations.map((item) => item.targetId)),
    ).not.toContain("123");
  });

  it("resends a rate-limited batch after the gateway's delay unless newer data is queued", () => {
    const publisher = vi.fn<(batch: AirTagObservationBatch) => void>();
    const controller = new AirTagObservationController();
    controller.configure({
      enabled: true,
      canPublish: true,
      mapId: 42,
      publisher,
    });
    controller.handle({
      "123": createOther(),
      "456": createOther({ nick: "Second" }),
    });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    const rejected = publisher.mock.calls[0]?.[0];

    if (!rejected) throw new Error("Expected a batch");
    controller.handle({ "456": { x: 20, y: 10, dir: 1 } });
    controller.retry(rejected, 2_000);
    vi.advanceTimersByTime(1_999);
    expect(publisher).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(publisher).toHaveBeenLastCalledWith({
      expectedMapId: 42,
      observations: expect.arrayContaining([
        expect.objectContaining({ targetId: "123", x: 10 }),
        expect.objectContaining({ targetId: "456", x: 20 }),
      ]),
    });
  });

  it("settles heartbeats of players who arrived at different times into one batch per interval", () => {
    const publisher = vi.fn<(batch: AirTagObservationBatch) => void>();
    const controller = new AirTagObservationController();
    controller.configure({
      enabled: true,
      canPublish: true,
      mapId: 42,
      publisher,
    });

    for (let index = 0; index < 40; index += 1) {
      controller.handle({
        [String(index)]: createOther({ nick: `P${index}` }),
      });
      vi.advanceTimersByTime(125);
    }

    vi.advanceTimersByTime(AIR_TAG_HEARTBEAT_INTERVAL_MS * 2);
    publisher.mockClear();
    vi.advanceTimersByTime(AIR_TAG_HEARTBEAT_INTERVAL_MS * 6);

    expect(publisher).toHaveBeenCalledTimes(6);
    expect(
      publisher.mock.calls.every(([batch]) => batch.observations.length === 40),
    ).toBe(true);
  });

  it("sends at most 50 observations per batch", () => {
    const publisher = vi.fn<(batch: AirTagObservationBatch) => void>();
    const controller = new AirTagObservationController();
    controller.configure({
      enabled: true,
      canPublish: true,
      mapId: 42,
      publisher,
    });
    const entries: Other = {};

    for (let index = 0; index < 55; index += 1) {
      entries[String(index)] = createOther({ nick: `Target ${index}` });
    }

    controller.handle(entries);
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    expect(publisher.mock.calls[0]?.[0].observations).toHaveLength(50);
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    expect(publisher.mock.calls[1]?.[0].observations).toHaveLength(5);
  });

  it("retains at most 100 local targets for the active scope", () => {
    const publisher = vi.fn<(batch: AirTagObservationBatch) => void>();
    const controller = new AirTagObservationController();
    controller.configure({
      enabled: true,
      canPublish: true,
      mapId: 42,
      publisher,
    });
    const entries: Other = {};

    for (let index = 0; index < 101; index += 1) {
      entries[String(index)] = createOther({ nick: `Target ${index}` });
    }

    controller.handle(entries);
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS * 3);

    const publishedCount = publisher.mock.calls.reduce(
      (count, [batch]) => count + batch.observations.length,
      0,
    );

    expect(publishedCount).toBe(100);
  });

  it("reports a published target it evicts for a new one as out of sight", () => {
    const publisher = vi.fn<(batch: AirTagObservationBatch) => void>();
    const controller = new AirTagObservationController();
    controller.configure({
      enabled: true,
      canPublish: true,
      mapId: 42,
      publisher,
    });
    const entries: Other = {};

    for (let index = 0; index < 100; index += 1) {
      entries[String(index)] = createOther({ nick: `Target ${index}` });
    }

    controller.handle(entries);
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS * 2);
    publisher.mockClear();

    controller.handle({ "100": createOther({ nick: "Newcomer" }) });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);

    expect(publisher).toHaveBeenCalledWith(
      expect.objectContaining({
        departures: [{ targetId: "0", reason: "out-of-sight" }],
      }),
    );
  });

  it("does not observe while disabled or disconnected", () => {
    const publisher = vi.fn<(batch: AirTagObservationBatch) => void>();
    const controller = new AirTagObservationController();
    controller.configure({
      enabled: false,
      canPublish: true,
      mapId: 42,
      publisher,
    });
    controller.handle({ "123": createOther() });

    controller.configure({
      enabled: true,
      canPublish: false,
      mapId: 42,
      publisher,
    });
    controller.handle({ "123": createOther() });
    vi.advanceTimersByTime(AIR_TAG_HEARTBEAT_INTERVAL_MS);

    expect(publisher).not.toHaveBeenCalled();
  });
});
