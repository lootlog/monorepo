import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createAirTagTest } from "./air-tag-test";
import { airTagReceiveController } from "./air-tag-receive-controller";
import { useAirTags } from "./use-air-tags";

const update = {
  v: 1 as const,
  type: "air-tag.updated" as const,
  data: {
    guildId: "guild-1",
    world: "fobos",
    mapId: 12,
    epochId: "epoch",
    epochStartedAt: 100,
    revision: 2,
    target: {
      targetId: "guild-1",
      nickname: "Target",
      relation: 1 as const,
      x: 20,
      y: 20,
      observedAt: Date.now(),
    },
  },
};

describe("useAirTags", () => {
  it("applies updates only while ready and clears state on unmount", async () => {
    const test = createAirTagTest();
    const view = renderHook(() => useAirTags(), { wrapper: test.wrapper });
    await test.join();
    expect(
      test.wire.frames.filter(
        (frame) => "type" in frame && frame.type === "presence.publish",
      ),
    ).toHaveLength(1);
    await test.acknowledge(["guild-1"]);
    await test.receive(update);
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10000),
    ).toEqual([expect.objectContaining({ targetId: "guild-1", x: 20 })]);
    const { target, ...scope } = update.data;
    await test.receive({
      v: 1,
      type: "air-tag.scope-updated",
      data: {
        ...scope,
        revision: 3,
        targets: [{ ...target, targetId: "guild-2", x: 30 }],
        removedTargetIds: ["guild-1"],
      },
    });
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10000),
    ).toEqual([expect.objectContaining({ targetId: "guild-2", x: 30 })]);
    act(() => test.wire.close());
    await act(() =>
      test.wire.receive({
        ...update,
        data: {
          ...update.data,
          revision: 4,
          target: { ...update.data.target, x: 40 },
        },
      }),
    );
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10000),
    ).toEqual([expect.objectContaining({ targetId: "guild-2", x: 30 })]);
    view.unmount();
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10000),
    ).toEqual([]);
  });
});
