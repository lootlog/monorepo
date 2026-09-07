import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import { afterEach, describe, expect, it, vi } from "#test/bun-test";
import { RealtimeClient, type RealtimeWebSocket } from "./realtime-client.js";

type Listener = (event: { readonly data?: unknown }) => void;

class TestWebSocket implements RealtimeWebSocket {
  binaryType: BinaryType = "blob";
  readyState = 0;
  readonly sent: Array<string | Uint8Array> = [];
  readonly listeners = new Map<string, Set<Listener>>();

  addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  send(data: string | Uint8Array): void {
    this.sent.push(data);
  }

  close(code?: number): void {
    if (code !== undefined && code !== 1000 && (code < 3000 || code > 4999))
      throw new DOMException(
        "Invalid WebSocket close code",
        "InvalidAccessError",
      );
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.dispatch("close");
  }

  open(): void {
    this.readyState = 1;
    this.dispatch("open");
  }

  message(data: string | Uint8Array): void {
    this.dispatch("message", { data });
  }

  private dispatch(
    type: string,
    event: { readonly data?: unknown } = {},
  ): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

const joinData = {
  world: "alpha",
  character: {
    world: "alpha",
    name: "Hero",
    lvl: 100,
    icon: "hero.gif",
    characterId: "10",
    accountId: "20",
    prof: "w",
  },
};

const respondToLastRequest = (
  socket: TestWebSocket,
  data: unknown = undefined,
): void => {
  const lastRequest = socket.sent.at(-1);
  if (!(lastRequest instanceof Uint8Array))
    throw new Error("Expected a binary request frame");
  const request = decodeRealtimeFrame(lastRequest);
  if (!("requestId" in request) || !request.requestId) {
    throw new Error("Expected a request frame");
  }
  socket.message(
    encodeRealtimeFrame({
      v: 1,
      requestId: request.requestId,
      status: "success",
      data,
    }),
  );
};

const flushMessages = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const socketAt = (sockets: TestWebSocket[], index: number): TestWebSocket => {
  const socket = sockets[index];
  if (!socket) throw new Error(`Expected socket at index ${index}`);
  return socket;
};

const frameAt = (socket: TestWebSocket, index: number) => {
  const bytes = socket.sent[index];
  if (!(bytes instanceof Uint8Array))
    throw new Error(`Expected binary frame at index ${index}`);
  return decodeRealtimeFrame(bytes);
};

describe("RealtimeClient", () => {
  afterEach(() => vi.useRealTimers());

  it("uses a credential-free websocket URL and exposes request/response plus events", async () => {
    const sockets: TestWebSocket[] = [];
    const states: string[] = [];
    const events: string[] = [];
    const client = new RealtimeClient({
      url: "https://gateway.example.test?token=forbidden",
      path: "/ws",
      webSocketFactory: (url) => {
        expect(url).toBe("wss://gateway.example.test/ws");
        const socket = new TestWebSocket();
        sockets.push(socket);
        return socket;
      },
    });
    client.subscribeState((state) => states.push(state));
    client.subscribe((event) => events.push(event.type));

    client.connect();
    socketAt(sockets, 0).open();
    const joined = client.join(joinData);
    respondToLastRequest(socketAt(sockets, 0), { organizationIds: ["org-1"] });
    await flushMessages();
    await joined;

    socketAt(sockets, 0).message(
      encodeRealtimeFrame({
        v: 1,
        type: "permissions.updated",
        data: { organizationIds: ["org-1"], subscriptionScopes: [] },
      }),
    );
    await flushMessages();

    expect(states).toEqual([
      "disconnected",
      "connecting",
      "connected",
      "joining",
      "ready",
    ]);
    expect(events).toEqual(["permissions.updated"]);
  });

  it("rejoins and restores logical subscriptions after jittered reconnect", async () => {
    vi.useFakeTimers();
    const sockets: TestWebSocket[] = [];
    const client = new RealtimeClient({
      url: "https://gateway.example.test",
      reconnectBaseDelayMs: 1_000,
      random: () => 0,
      webSocketFactory: () => {
        const socket = new TestWebSocket();
        sockets.push(socket);
        return socket;
      },
    });
    client.connect();
    socketAt(sockets, 0).open();
    const joined = client.join(joinData);
    respondToLastRequest(socketAt(sockets, 0));
    await flushMessages();
    await joined;

    const subscribed = client.subscribeScope({
      topic: "organization.chat",
      organizationId: "org-1",
    });
    respondToLastRequest(socketAt(sockets, 0));
    await flushMessages();
    await subscribed;

    socketAt(sockets, 0).close();
    await vi.advanceTimersByTimeAsync(499);
    expect(sockets).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(sockets).toHaveLength(2);

    socketAt(sockets, 1).open();
    const rejoin = frameAt(socketAt(sockets, 1), 0);
    expect("type" in rejoin ? rejoin.type : undefined).toBe("session.join");
    respondToLastRequest(socketAt(sockets, 1));
    await flushMessages();
    const resubscribe = frameAt(socketAt(sockets, 1), 1);
    expect("type" in resubscribe ? resubscribe.type : undefined).toBe(
      "subscription.subscribe",
    );
    respondToLastRequest(socketAt(sockets, 1));
    await flushMessages();
    expect(client.state).toBe("ready");
  });

  it("runs the reconnect handler and heartbeats the restored presence session", async () => {
    vi.useFakeTimers();
    const sockets: TestWebSocket[] = [];
    const client = new RealtimeClient({
      url: "https://gateway.example.test",
      reconnectBaseDelayMs: 1_000,
      random: () => 0,
      webSocketFactory: () => {
        const socket = new TestWebSocket();
        sockets.push(socket);
        return socket;
      },
    });
    const restoreSession = async () => {
      await client.join(joinData);
      await client.request("presence.publish", { organizationIds: ["org-1"] });
    };
    client.setReconnectHandler(restoreSession);
    client.connect();
    const first = socketAt(sockets, 0);
    first.open();
    const initial = restoreSession();
    respondToLastRequest(first);
    await flushMessages();
    respondToLastRequest(first, { sessionId: "initial-presence" });
    await flushMessages();
    await initial;
    first.close();

    await vi.advanceTimersByTimeAsync(500);
    const second = socketAt(sockets, 1);
    second.open();
    respondToLastRequest(second);
    await flushMessages();
    expect(frameAt(second, 1)).toMatchObject({ type: "presence.publish" });
    respondToLastRequest(second, { sessionId: "restored-presence" });
    await flushMessages();
    await vi.advanceTimersByTimeAsync(25_000);
    expect(frameAt(second, 2)).toMatchObject({
      type: "presence.heartbeat",
      data: { sessionId: "restored-presence" },
    });
    respondToLastRequest(second);
    await flushMessages();
    client.disconnect();
  });

  it("backs off when sockets open but session joins keep failing", async () => {
    vi.useFakeTimers();
    const sockets: TestWebSocket[] = [];
    const client = new RealtimeClient({
      url: "https://gateway.example.test",
      reconnectBaseDelayMs: 1_000,
      random: () => 0,
      webSocketFactory: () => {
        const socket = new TestWebSocket();
        sockets.push(socket);
        return socket;
      },
    });

    client.connect();
    await flushMessages();
    socketAt(sockets, 0).open();
    void client.join(joinData).catch(() => undefined);
    socketAt(sockets, 0).close();

    await vi.advanceTimersByTimeAsync(500);
    await flushMessages();
    socketAt(sockets, 1).open();
    socketAt(sockets, 1).close();

    await vi.advanceTimersByTimeAsync(500);
    await flushMessages();
    expect(sockets).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(500);
    await flushMessages();
    expect(sockets).toHaveLength(3);
    client.disconnect();
  });

  it("preserves only configured frame and capability protocols on reconnect", async () => {
    vi.useFakeTimers();
    const sockets: TestWebSocket[] = [];
    const protocolsSeen: Array<string[] | undefined> = [];
    const client = new RealtimeClient({
      url: "https://gateway.example.test?ticket=must-be-removed",
      reconnectBaseDelayMs: 1_000,
      random: () => 0,
      protocols: ["lootlog.realtime.v1", "lootlog.cap.feed.v1"],
      webSocketFactory: (url, protocols) => {
        expect(url).toBe("wss://gateway.example.test/ws");
        protocolsSeen.push(protocols);
        const socket = new TestWebSocket();
        sockets.push(socket);
        return socket;
      },
    });
    client.connect();
    await flushMessages();
    expect(protocolsSeen[0]).toEqual([
      "lootlog.realtime.v1",
      "lootlog.cap.feed.v1",
    ]);
    socketAt(sockets, 0).open();
    socketAt(sockets, 0).close();
    await vi.advanceTimersByTimeAsync(500);
    await flushMessages();
    expect(protocolsSeen[1]).toEqual([
      "lootlog.realtime.v1",
      "lootlog.cap.feed.v1",
    ]);
    client.disconnect();
  });

  it("closes malformed frames with a browser-permitted code and reconnects", async () => {
    vi.useFakeTimers();
    const socket = new TestWebSocket();
    const client = new RealtimeClient({
      url: "https://gateway.example.test",
      webSocketFactory: () => socket,
    });
    client.connect();
    socket.open();
    socket.message("unexpected text instead of MessagePack");
    await flushMessages();
    expect(socket.readyState).toBe(3);
    expect(client.state).toBe("reconnecting");
    client.disconnect();
  });

  it("uses readable JSON frames when requested", async () => {
    const sockets: TestWebSocket[] = [];
    const client = new RealtimeClient({
      url: "https://gateway.example.test",
      frameEncoding: "json",
      webSocketFactory: () => {
        const socket = new TestWebSocket();
        sockets.push(socket);
        return socket;
      },
    });

    client.connect();
    const socket = socketAt(sockets, 0);
    socket.open();
    const joined = client.join(joinData);
    const request = socket.sent.at(-1);

    expect(typeof request).toBe("string");
    const frame = JSON.parse(request as string) as {
      requestId: string;
    };
    socket.message(
      JSON.stringify({
        v: 1,
        requestId: frame.requestId,
        status: "success",
        data: { organizationIds: ["org-1"] },
      }),
    );
    await flushMessages();

    await joined;
    expect(client.state).toBe("ready");
  });

  it("stops heartbeats after an empty presence publication clears the session", async () => {
    vi.useFakeTimers();
    const sockets: TestWebSocket[] = [];
    const client = new RealtimeClient({
      url: "https://gateway.example.test",
      webSocketFactory: () => {
        const socket = new TestWebSocket();
        sockets.push(socket);
        return socket;
      },
    });
    client.connect();
    const socket = socketAt(sockets, 0);
    socket.open();
    const joined = client.join(joinData);
    respondToLastRequest(socket);
    await flushMessages();
    await joined;

    const published = client.request("presence.publish", {
      organizationIds: ["org-1"],
    });
    respondToLastRequest(socket, { sessionId: "session-1" });
    await flushMessages();
    await published;
    const cleared = client.request("presence.publish", { organizationIds: [] });
    respondToLastRequest(socket);
    await flushMessages();
    await cleared;
    const sentAfterClear = socket.sent.length;

    await vi.advanceTimersByTimeAsync(25_000);
    expect(socket.sent).toHaveLength(sentAfterClear);
  });
});
