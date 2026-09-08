import { describe, expect, it, onTestFinished } from "vitest";
import { createAirTagTest } from "./air-tag-test";
import { airTagReceiveController } from "./air-tag-receive-controller";

describe("AirTagRuntime", () => {
  it("publishes presence before subscribing to the current map", async () => {
    const test = createAirTagTest();
    onTestFinished(() => test.runtime.shutdown());
    test.runtime.configure({ connected: true, enabled: true, joined: true });
    expect(test.wire.frames).toEqual([
      expect.objectContaining({
        type: "presence.publish",
        data: expect.objectContaining({
          location: expect.objectContaining({ mapId: 12, map: "Torneg" }),
        }),
      }),
      expect.objectContaining({
        type: "air-tag.subscription",
        data: expect.objectContaining({ enabled: true, expectedMapId: 12 }),
      }),
    ]);
    await test.acknowledge(["guild-1"]);
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10000),
    ).toEqual([expect.objectContaining({ targetId: "guild-1" })]);
  });
  it("subscribes using raw map-change data before the normalized map updates", async () => {
    const test = createAirTagTest();
    onTestFinished(() => test.runtime.shutdown());
    test.runtime.configure({ connected: true, enabled: true, joined: true });
    await test.acknowledge();
    test.wire.frames.length = 0;
    test.runtime.handleMapChange(13, "Nithal");
    expect(test.wire.frames).toEqual([
      expect.objectContaining({
        type: "air-tag.subscription",
        data: expect.objectContaining({ enabled: true, expectedMapId: 13 }),
      }),
    ]);
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10000),
    ).toEqual([]);
    await test.acknowledge(["guild-1"]);
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10000),
    ).toHaveLength(1);
  });
  it("unsubscribes and clears received state when disabled", async () => {
    const test = createAirTagTest();
    onTestFinished(() => test.runtime.shutdown());
    test.runtime.configure({ connected: true, enabled: true, joined: true });
    await test.acknowledge();
    test.wire.frames.length = 0;
    test.runtime.configure({ connected: true, enabled: false, joined: true });
    expect(test.subscriptions()).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({ enabled: false }),
      }),
    ]);
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10000),
    ).toEqual([]);
  });
});
