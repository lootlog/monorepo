import { act, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeClient } from "@lootlog/client/realtime";
import { SocketProvider } from "@/contexts/socket-context";
import { configureGameClientPlatform } from "@/lib/game-client-platform";
import { disposeSocket } from "@/lib/socket";
import { RealtimeWire } from "@/test/realtime-wire";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { usePartyReadyRoomSocket } from "./use-party-ready-room-socket";

function ReadyRoomListener() {
  usePartyReadyRoomSocket();

  return null;
}

describe("usePartyReadyRoomSocket", () => {
  let wire: RealtimeWire;
  let realtime: RealtimeClient;
  let restorePlatform: () => void;

  beforeEach(() => {
    disposeSocket();
    usePartyFinderStore.setState(usePartyFinderStore.getInitialState(), true);
    wire = new RealtimeWire();
    realtime = new RealtimeClient({
      url: "https://gateway.example.test",
      webSocketFactory: () => wire,
    });
    restorePlatform = configureGameClientPlatform({
      fetch: globalThis.fetch,
      createRealtime: () => realtime,
    });
  });

  afterEach(() => {
    disposeSocket();
    restorePlatform();
    usePartyFinderStore.setState(usePartyFinderStore.getInitialState(), true);
  });

  it("applies personalized gateway updates and stops applying them after unmount", async () => {
    const view = render(
      createElement(SocketProvider, null, createElement(ReadyRoomListener)),
    );

    act(() => wire.open());

    const update = (revision: number) => {
      wire.receive({
        v: 1,
        type: "party-ready-room.updated",
        data: {
          organizationId: "guild-1",
          payload: {
            schemaVersion: 3,
            type: "REMOVE",
            notificationId: "room-1",
            revision,
          },
        },
      });
    };

    act(() => update(4));
    await vi.waitFor(() => {
      expect(
        usePartyFinderStore.getState().roomVersions["room-1"]?.revision,
      ).toBe(4);
    });

    view.rerender(createElement(SocketProvider, null));
    const received = Promise.withResolvers<void>();
    const stopObserving = realtime.subscribe(() => received.resolve());
    await act(async () => {
      update(5);
      await received.promise;
    });
    stopObserving();
    expect(
      usePartyFinderStore.getState().roomVersions["room-1"]?.revision,
    ).toBe(4);
    view.unmount();
  });
});
