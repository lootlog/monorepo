import { stubMargonemAccountFetch } from "@/test/margonem-account-fetch";
import { act } from "@testing-library/react";
import { RealtimeClient } from "@lootlog/client/realtime";
import { vi } from "vitest";
import { configureGameClientPlatform } from "@/lib/game-client-platform";
import { disposeSocket, getSocket } from "@/lib/socket";
import { RealtimeWire } from "@/test/realtime-wire";
import type { AccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";

export const createTimerRealtimeFixture = () => {
  disposeSocket();
  const wire = new RealtimeWire();

  const externalFetch = stubMargonemAccountFetch();

  const realtime = new RealtimeClient({
    url: "https://gateway.example.test",
    webSocketFactory: () => wire,
  });

  const restorePlatform = configureGameClientPlatform({
    fetch: globalThis.fetch,
    createRealtime: () => realtime,
  });

  const join = async (
    organizationIds: string[],
    accessPolicy?: AccessPolicySnapshot,
  ) => {
    const pending = getSocket().join(
      {
        world: "luvia",
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

    await acknowledgeJoin(organizationIds, accessPolicy);
    await pending;
  };

  const acknowledgedRequests = new Set<string>();

  const acknowledgeJoin = async (
    organizationIds: string[],
    accessPolicy?: AccessPolicySnapshot,
  ) => {
    await vi.waitFor(() => expectJoinRequest());
    await act(() => {
      for (const frame of wire.frames) {
        if (
          !("type" in frame) ||
          frame.type !== "session.join" ||
          !frame.requestId ||
          acknowledgedRequests.has(frame.requestId)
        )
          continue;
        acknowledgedRequests.add(frame.requestId);
        wire.receive({
          v: 1,
          requestId: frame.requestId,
          status: "success",
          data: {
            connectionId: "connection-1",
            organizationIds,
            accessPolicy,
            capabilities: ["connection.ping"],
          },
        });
      }
    });
  };

  const expectJoinRequest = () => {
    const request = wire.frames.findLast(
      (frame) => "type" in frame && frame.type === "session.join",
    );

    if (
      !request ||
      !("requestId" in request) ||
      acknowledgedRequests.has(request.requestId ?? "")
    )
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
    acknowledgeJoin,
    receive,
    cleanup: () => {
      disposeSocket();
      restorePlatform();
      externalFetch.mockRestore();
    },
  };
};
