import {
  RealtimeClient,
  type RealtimeWebSocket,
} from "@lootlog/client/realtime";
import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import { configureGameClientPlatform } from "./game-client-platform";
import { useGameStore } from "@/store/game.store";
import { afterEach, describe, expect, it, vi } from "vitest";
import { disposeSocket, getSocket } from "./socket";

describe("realtime socket facade lifecycle", () => {
  afterEach(() => disposeSocket());

  it("creates at most one active facade", () => {
    expect(getSocket()).toBe(getSocket());
  });

  it("fully disposes the singleton before creating a replacement", () => {
    const firstSocket = getSocket();
    const disconnect = vi.spyOn(firstSocket, "disconnect");
    const removeAllListeners = vi.spyOn(firstSocket, "removeAllListeners");

    disposeSocket();
    const secondSocket = getSocket();

    expect(disconnect).toHaveBeenCalledOnce();
    expect(removeAllListeners).toHaveBeenCalledOnce();
    expect(secondSocket).not.toBe(firstSocket);
  });
});

it("publishes once after replacing a shared transport facade and preserves reconnects", async () => {
  const listeners = new Map<string, (event: { data?: unknown }) => void>();
  const send = vi.fn((bytes: string | Uint8Array) => {
    if (!(bytes instanceof Uint8Array))
      throw new Error("Expected binary frame");
    const frame = decodeRealtimeFrame(bytes);
    if (!("requestId" in frame) || !frame.requestId)
      throw new Error("Expected request frame");
    const requestId = frame.requestId;
    queueMicrotask(() =>
      listeners.get("message")?.({
        data: encodeRealtimeFrame({
          v: 1,
          requestId,
          status: "success",
        }),
      }),
    );
  });
  const wire: RealtimeWebSocket = {
    readyState: 1,
    binaryType: "arraybuffer",
    addEventListener: (type, listener) => {
      listeners.set(type, listener);
    },
    send,
    close: () => {
      listeners.get("close")?.({});
    },
  };
  const realtime = new RealtimeClient({
    url: "https://gateway.example.test",
    webSocketFactory: () => wire,
  });
  const restorePlatform = configureGameClientPlatform({
    fetch: globalThis.fetch,
    createRealtime: () => realtime,
  });
  const previousGame = useGameStore.getState().game;
  try {
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "20",
        characterId: "10",
        currentHp: 100,
        icon: "hero.gif",
        level: 100,
        maxHp: 100,
        name: "Hero",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 100, name: "Karka-han", visibility: 0 },
      world: "alpha",
    });
    const oldFacade = getSocket();
    disposeSocket();
    const activeFacade = getSocket();
    // Disposing an old facade twice must not detach its replacement.
    oldFacade.dispose();
    activeFacade.connect();
    listeners.get("open")?.({});
    expect(activeFacade.connected).toBe(true);
    expect(oldFacade.connected).toBe(false);
    activeFacade.disconnect();
    activeFacade.connect();
    listeners.get("open")?.({});
    expect(activeFacade.connected).toBe(true);
    listeners.get("message")?.({
      data: encodeRealtimeFrame({
        v: 1,
        type: "permissions.updated",
        data: { organizationIds: ["organization-1"], subscriptionScopes: [] },
      }),
    });
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
    const bytes = send.mock.calls[0]?.[0];
    if (!(bytes instanceof Uint8Array))
      throw new Error("Expected presence publication");
    expect(decodeRealtimeFrame(bytes)).toMatchObject({
      type: "presence.publish",
      data: { organizationIds: ["organization-1"] },
    });
  } finally {
    disposeSocket();
    restorePlatform();
    useGameStore.setState({ game: previousGame });
  }
});
