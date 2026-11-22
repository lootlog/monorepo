import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventDispatcher } from "@/lib/event-dispatcher";
import { airTagGameEventObserver } from "./air-tag-game-event-observer";
import { createAirTagTest } from "./air-tag-test";
import { airTagRuntime } from "./air-tag-runtime";
import {
  AIR_TAG_BATCH_INTERVAL_MS,
  airTagObservationController,
} from "./air-tag-observation-controller";
import type { OtherCreate } from "@lootlog/margonem/game-events";

const other: OtherCreate = {
  action: "CREATE",
  account: 10,
  nick: "Target",
  icon: "target.gif",
  x: 10,
  y: 20,
  dir: 0,
  stasis: 0,
  stasis_incoming_seconds: 0,
  rights: 0,
  lvl: 300,
  oplvl: 300,
  prof: "w",
  attr: 0,
  is_blessed: 0,
  relation: 6,
};

const dispatcher = () =>
  new EventDispatcher({ observers: [airTagGameEventObserver] });

describe("airTagGameEventObserver", () => {
  let test: ReturnType<typeof createAirTagTest>;
  beforeEach(() => {
    test = createAirTagTest();
    airTagRuntime.configure({ connected: true, joined: true });
    test.wire.frames.length = 0;
  });
  afterEach(() => {
    airTagRuntime.shutdown();
  });
  it("batches a native other CREATE into the current map observation", async () => {
    dispatcher().handleEvent({ other: { "42": other } });
    await new Promise<void>((resolve) =>
      setTimeout(resolve, AIR_TAG_BATCH_INTERVAL_MS + 10),
    );
    expect(test.wire.frames).toEqual([
      expect.objectContaining({
        type: "air-tag.observation",
        data: {
          expectedMapId: 12,
          observations: [
            expect.objectContaining({
              targetId: "42",
              nickname: "Target",
              x: 10,
              y: 20,
            }),
          ],
        },
      }),
    ]);
  });
  it("ignores events without other data", async () => {
    dispatcher().handleEvent({});
    await new Promise<void>((resolve) =>
      setTimeout(resolve, AIR_TAG_BATCH_INTERVAL_MS + 10),
    );
    expect(test.wire.frames).toEqual([]);
  });
  it("forgets targets when Margonem reloads the map without deleting its players", () => {
    const forgetTargets = vi.spyOn(
      airTagObservationController,
      "forgetTargets",
    );

    dispatcher().handleEvent({ t: "reload" });

    expect(forgetTargets).toHaveBeenCalledOnce();
  });
});
