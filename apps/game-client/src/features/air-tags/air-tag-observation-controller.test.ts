import type { Other, OtherCreate } from "@lootlog/margonem/game-events";
import {
  AIR_TAG_BATCH_INTERVAL_MS,
  AIR_TAG_HEARTBEAT_INTERVAL_MS,
  AirTagObservationController,
} from "./air-tag-observation-controller";

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
    window.Engine = {
      hero: { d: { id: 999 } },
      others: { check: vi.fn(() => ({})) },
    } as never;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("batches CREATE and significant movement but ignores small movement", () => {
    const publisher = vi.fn();
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

    controller.handle({ "123": { x: 12, y: 10, dir: 1 } });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    expect(publisher).toHaveBeenCalledTimes(1);

    controller.handle({ "123": { x: 13, y: 10, dir: 1 } });
    vi.advanceTimersByTime(AIR_TAG_BATCH_INTERVAL_MS);
    expect(publisher).toHaveBeenCalledTimes(2);
    expect(publisher).toHaveBeenLastCalledWith({
      expectedMapId: 42,
      observations: [expect.objectContaining({ x: 13, y: 10 })],
    });
  });

  it("publishes a stationary target heartbeat before the server TTL", () => {
    const publisher = vi.fn();
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

  it("stops heartbeats after del and cancels pending data on map change", () => {
    const publisher = vi.fn();
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

  it("sends at most 50 observations per batch", () => {
    const publisher = vi.fn();
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

  it("does not observe while disabled or disconnected", () => {
    const publisher = vi.fn();
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
