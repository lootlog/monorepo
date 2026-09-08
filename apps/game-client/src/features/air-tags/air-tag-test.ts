import { act } from "@testing-library/react";
import { getSocket } from "@/lib/socket";
import { createRealtimeTest } from "@/test/realtime-test";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { AirTagRuntime } from "./air-tag-runtime";
import type { AirTagSubscriptionAck } from "@lootlog/schema/air-tag";

export const createAirTagTest = () => {
  const test = createRealtimeTest();
  setTestRuntimeGame({
    world: "fobos",
    map: { id: 12, name: "Torneg", visibility: 30 },
  });
  getSocket().connect();
  test.open();
  const runtime = new AirTagRuntime();
  const subscriptions = () =>
    test.wire.frames.filter(
      (frame) => "type" in frame && frame.type === "air-tag.subscription",
    );
  const acknowledge = async (guildIds = ["guild-1", "guild-2"]) => {
    const request = subscriptions().at(-1);
    if (
      !request ||
      request.type !== "air-tag.subscription" ||
      !request.requestId
    )
      throw new Error("Missing air subscription");
    const acknowledgement: AirTagSubscriptionAck = {
      status: "accepted",
      requestId: request.data.requestId,
      scopes: guildIds.map((guildId) => ({
        guildId,
        world: "fobos",
        mapId: request.data.expectedMapId ?? 12,
        epochId: "epoch",
        epochStartedAt: 100,
        revision: 1,
        targets: [
          {
            targetId: guildId,
            nickname: guildId,
            relation: 1,
            x: 10,
            y: 10,
            observedAt: Date.now(),
          },
        ],
      })),
    };
    const requestId = request.requestId;
    await act(() =>
      test.wire.receive({
        v: 1,
        requestId,
        status: "success",
        data: acknowledgement,
      }),
    );
  };
  return { ...test, runtime, subscriptions, acknowledge };
};
