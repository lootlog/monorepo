import { act } from "@testing-library/react";
import { RealtimeClient } from "@lootlog/client/realtime";
import { vi } from "vitest";
import { configureGameClientPlatform } from "@/lib/game-client-platform";
import { disposeSocket, getSocket } from "@/lib/socket";
import { RealtimeWire } from "@/test/realtime-wire";

export const createTimerRealtimeFixture = () => {
  disposeSocket();
  const wire = new RealtimeWire();
  const realtime = new RealtimeClient({
    url: "https://gateway.example.test",
    webSocketFactory: () => wire,
  });
  const restorePlatform = configureGameClientPlatform({
    fetch: globalThis.fetch,
    createRealtime: () => realtime,
  });
  const join = async (organizationIds: string[]) => {
    const pending = getSocket().join(
      {
        world: "pandora",
        name: "Hero",
        lvl: 100,
        icon: "hero.gif",
        prof: "w",
        characterId: "1",
        accountId: "2",
      },
      {
        userId: "2",
        characterId: "1",
        token: "test-proof",
        ts: 1,
        validatedString: "test",
        signatureBase64: "test",
      },
    );
    await vi.waitFor(() => expectJoinRequest());
    const request = expectJoinRequest();
    const requestId = request.requestId;
    if (!requestId) throw new Error("Expected session join request id");
    await act(async () => {
      wire.receive({
        v: 1,
        requestId,
        status: "success",
        data: { connectionId: "connection-1", organizationIds },
      });
      await pending;
    });
  };
  const expectJoinRequest = () => {
    const request = wire.frames.findLast(
      (frame) => "type" in frame && frame.type === "session.join",
    );
    if (!request || !("requestId" in request))
      throw new Error("Expected session join request");
    return request;
  };
  const receive = async (frame: Parameters<RealtimeWire["receive"]>[0]) => {
    const delivered = Promise.withResolvers<void>();
    const unsubscribe = realtime.subscribe(() => delivered.resolve());
    await act(async () => {
      wire.receive(frame);
      await delivered.promise;
    });
    unsubscribe();
  };
  return {
    wire,
    join,
    receive,
    cleanup: () => {
      disposeSocket();
      restorePlatform();
    },
  };
};
