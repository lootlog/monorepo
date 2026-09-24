import { decodeClientCommand } from "@lootlog/protocol/realtime";
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
  readonly closeCodes: Array<number | undefined> = [];
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
    this.closeCodes.push(code);
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

const heartbeatSession = async () => {
  vi.useFakeTimers();
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  const sockets: TestWebSocket[] = [];

  const client = new RealtimeClient({
    url: "https://gateway.example.test",
    random: () => 0,
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

  respondToLastRequest(socket, { sessionId: "presence-1" });
  await flushMessages();
  await published;

  const advance = async (ms: number) => {
    now += ms;
    await vi.advanceTimersByTimeAsync(ms);
    await flushMessages();
  };

  await advance(25_000);

  return {
    client,
    socket,
    sockets,
    advance,
    suspend: (ms: number) => {
      now += ms;
    },
  };
};

const rejectLastRequest = async (
  socket: TestWebSocket,
  retryable: boolean,
  retryAfterMs?: number,
) => {
  const last = socket.sent.at(-1);

  if (!(last instanceof Uint8Array)) throw new Error("Missing request");
  const frame = decodeRealtimeFrame(last);

  if (!("requestId" in frame) || !frame.requestId)
    throw new Error("Missing request ID");
  socket.message(
    encodeRealtimeFrame({
      v: 1,
      requestId: frame.requestId,
      status: "error",
      error: {
        code: "COMMAND_REJECTED",
        message: "fixture failure",
        retryable,
        retryAfterMs,
      },
    }),
  );
  await flushMessages();
};

describe("RealtimeClient", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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

    // Commands decoded from a server connection must never reach event consumers.
    socketAt(sockets, 0).message(
      encodeRealtimeFrame({
        v: 1,
        type: "presence.fetch",
        data: { organizationId: "org-1" },
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

  it("does not also auto-join when a connection observer starts the session", async () => {
    vi.useFakeTimers();
    const sockets: TestWebSocket[] = [];

    const client = new RealtimeClient({
      url: "https://gateway.example.test",
      random: () => 0,
      webSocketFactory: () => {
        const socket = new TestWebSocket();
        sockets.push(socket);

        return socket;
      },
    });

    client.subscribeState((state) => {
      if (state === "connected") void client.join(joinData);
    });
    client.connect();
    const first = socketAt(sockets, 0);
    first.open();
    expect(first.sent).toHaveLength(1);
    respondToLastRequest(first);
    await flushMessages();
    first.close();
    await vi.advanceTimersByTimeAsync(500);
    const second = socketAt(sockets, 1);
    second.open();
    expect(second.sent).toHaveLength(1);
    respondToLastRequest(second);
    await flushMessages();
    expect(client.state).toBe("ready");
    client.disconnect();
  });

  it("shares a pending join between observers without dropping a later session update", async () => {
    vi.useFakeTimers();
    const socket = new TestWebSocket();

    const client = new RealtimeClient({
      url: "https://gateway.example.test",
      webSocketFactory: () => socket,
    });

    client.connect();
    socket.open();
    const joined = client.join(joinData);
    const duplicate = client.join({ ...joinData });
    const updated = client.join({ ...joinData, margonemAccountProof: "proof" });

    expect(socket.sent).toHaveLength(1);
    respondToLastRequest(socket, { connectionId: "first-join" });
    await expect(joined).resolves.toEqual({ connectionId: "first-join" });
    await expect(duplicate).resolves.toEqual({ connectionId: "first-join" });
    expect(socket.sent).toHaveLength(2);
    expect(frameAt(socket, 1)).toMatchObject({
      type: "session.join",
      data: { margonemAccountProof: "proof" },
    });
    respondToLastRequest(socket, { connectionId: "verified-join" });
    await expect(updated).resolves.toEqual({ connectionId: "verified-join" });
    expect(client.state).toBe("ready");
    client.disconnect();
  });

  it("does not replay a queued proof onto a replacement connection", async () => {
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

    client.setReconnectHandler(async () => undefined);
    let replaced = false;
    let replacement = Promise.resolve<unknown>(undefined);

    client.subscribeState((state) => {
      if (state !== "ready" || replaced) return;
      replaced = true;
      client.disconnect();
      client.connect();
      socketAt(sockets, 1).open();
      replacement = client.join({
        ...joinData,
        margonemAccountProof: "replacement-proof",
      });
    });
    client.connect();
    const first = socketAt(sockets, 0);
    first.open();
    const initial = client.join(joinData);

    const queued = client
      .join({ ...joinData, margonemAccountProof: "old-connection-proof" })
      .catch((error: Error) => error);

    respondToLastRequest(first);
    await initial;
    const second = socketAt(sockets, 1);
    respondToLastRequest(second);
    await replacement;
    await flushMessages();

    expect(second.sent).toHaveLength(1);
    expect(frameAt(second, 0)).toMatchObject({
      type: "session.join",
      data: { margonemAccountProof: "replacement-proof" },
    });
    expect(await queued).toBeInstanceOf(Error);
    expect(client.state).toBe("ready");
    client.disconnect();
  });

  it.each([false, true])(
    "automatically reconnects after a rejected join only when retryable is %s",
    async (retryable) => {
      vi.useFakeTimers();
      const sockets: TestWebSocket[] = [];

      const client = new RealtimeClient({
        url: "https://gateway.example.test",
        random: () => 0,
        webSocketFactory: () => {
          const socket = new TestWebSocket();
          sockets.push(socket);

          return socket;
        },
      });

      client.connect();
      const first = socketAt(sockets, 0);
      first.open();

      const joined = client.join(joinData).catch((error: Error) => error);

      await rejectLastRequest(first, retryable);
      expect(await joined).toMatchObject({ retryable });
      await vi.advanceTimersByTimeAsync(1_000);
      expect(sockets).toHaveLength(retryable ? 2 : 1);

      if (!retryable) {
        expect(client.state).toBe("disconnected");
        client.connect();
        const second = socketAt(sockets, 1);
        second.open();
        respondToLastRequest(second);
        await flushMessages();
        expect(client.state).toBe("ready");
      }

      client.disconnect();
    },
  );

  it("keeps delivering events and connection changes after an observer throws", async () => {
    vi.useFakeTimers();
    const socket = new TestWebSocket();
    const states: string[] = [];
    const events: string[] = [];

    const client = new RealtimeClient({
      url: "https://gateway.example.test",
      webSocketFactory: () => socket,
    });

    client.subscribeState((state) => {
      if (state !== "disconnected") throw new Error("state observer failed");
    });
    client.subscribeState((state) => states.push(state));
    client.subscribe(() => {
      throw new Error("event observer failed");
    });
    client.subscribe((event) => events.push(event.type));
    client.connect();
    socket.open();
    const joined = client.join(joinData);
    respondToLastRequest(socket);
    await joined;
    socket.message(
      encodeRealtimeFrame({
        v: 1,
        type: "permissions.updated",
        data: { organizationIds: ["org-1"], subscriptionScopes: [] },
      }),
    );
    await flushMessages();
    expect(events).toEqual(["permissions.updated"]);
    expect(states).toEqual([
      "disconnected",
      "connecting",
      "connected",
      "joining",
      "ready",
    ]);
    expect(socket.closeCodes).toEqual([]);
    expect(client.state).toBe("ready");
    client.disconnect();
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

    let now = 1_000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const latencies: Array<number | null> = [];
    client.subscribeHeartbeatLatency((value) => latencies.push(value));

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
    let observerJoin = Promise.resolve<unknown>(undefined);
    client.subscribeState((state) => {
      if (state === "connected") observerJoin = client.join(joinData);
    });
    client.setReconnectHandler(async () => {
      await observerJoin;
      await client.request("presence.publish", { organizationIds: ["org-1"] });
    });
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
    expect(latencies.at(-1)).toBeNull();
    now += 42;
    respondToLastRequest(second);
    await flushMessages();
    expect(latencies.at(-1)).toBe(42);
    expect(second.sent).toHaveLength(3);
    client.disconnect();
    expect(latencies.at(-1)).toBeNull();
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

    if (request === undefined || request instanceof Uint8Array)
      throw new Error("Expected a JSON request");
    const frame = decodeClientCommand(JSON.parse(request));
    expect(frame.requestId).toBeDefined();
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

  it("retries a transient heartbeat rejection on the same socket without replaying startup", async () => {
    const { client, socket, advance } = await heartbeatSession();
    await rejectLastRequest(socket, true);
    expect(client.state).toBe("ready");
    expect(socket.closeCodes).toEqual([]);
    await advance(500);
    expect(frameAt(socket, 3)).toMatchObject({
      type: "presence.heartbeat",
      data: { sessionId: "presence-1" },
    });
    respondToLastRequest(socket);
    await flushMessages();
    expect(socket.sent).toHaveLength(4);
    expect(client.state).toBe("ready");
    client.disconnect();
  });

  it("survives several seconds of retryable failures without replaying startup", async () => {
    const { client, socket, sockets, advance } = await heartbeatSession();

    for (const delay of [500, 1_000, 2_000, 2_500]) {
      await rejectLastRequest(socket, true);
      await advance(delay);
      expect(socket.closeCodes).toEqual([]);
    }

    respondToLastRequest(socket);
    await flushMessages();
    await advance(25_000);
    expect(frameAt(socket, socket.sent.length - 1)).toMatchObject({
      type: "presence.heartbeat",
      data: { sessionId: "presence-1" },
    });
    expect(sockets).toHaveLength(1);
    expect(
      socket.sent
        .map((_, index) => frameAt(socket, index))
        .filter((frame) => "type" in frame && frame.type === "session.join"),
    ).toHaveLength(1);
    client.disconnect();
  });

  it("bounds retryable failures by the last successful presence refresh", async () => {
    const { client, socket, advance } = await heartbeatSession();

    for (const delay of [500, 1_000, 2_000, ...Array<number>(12).fill(2_500)]) {
      await rejectLastRequest(socket, true);

      if (socket.closeCodes.length > 0) break;
      await advance(delay);
    }

    expect(socket.closeCodes).toEqual([4003]);
    expect(client.state).toBe("reconnecting");
    client.disconnect();
  });

  it.each(["retryable", "timeout"] as const)(
    "keeps fresh presence after an older in-flight heartbeat ends with %s",
    async (outcome) => {
      const { client, socket, sockets, advance } = await heartbeatSession();

      for (const delay of [
        500,
        1_000,
        2_000,
        ...Array<number>(10).fill(2_500),
      ]) {
        await rejectLastRequest(socket, true);
        await advance(delay);
      }

      await rejectLastRequest(socket, true);
      await advance(1_500);

      const publication = client.request("presence.publish", {
        organizationIds: ["org-1"],
      });

      const publish = frameAt(socket, socket.sent.length - 1);

      if (!("requestId" in publish) || !publish.requestId)
        throw new Error("Missing presence publication");

      await advance(1_000);
      const sentBeforeRefresh = socket.sent.length;

      await advance(500);
      // Preserve gateway FIFO: the publication was queued before this heartbeat.
      socket.message(
        encodeRealtimeFrame({
          v: 1,
          requestId: publish.requestId,
          status: "success",
          data: { sessionId: "presence-1" },
        }),
      );
      await flushMessages();
      await publication;
      await advance(1_500);

      if (outcome === "retryable") await rejectLastRequest(socket, true);
      await advance(2_000);
      expect(socket.closeCodes).toEqual([]);
      expect(client.state).toBe("ready");
      expect(sockets).toHaveLength(1);
      expect(socket.sent).toHaveLength(sentBeforeRefresh);

      await advance(21_500);
      expect(socket.sent).toHaveLength(sentBeforeRefresh + 1);
      expect(frameAt(socket, socket.sent.length - 1)).toMatchObject({
        type: "presence.heartbeat",
        data: { sessionId: "presence-1" },
      });
      client.disconnect();
    },
  );

  it("does not retry access denial or an unresponsive heartbeat", async () => {
    const denied = await heartbeatSession();
    await rejectLastRequest(denied.socket, false);
    expect(denied.socket.closeCodes).toEqual([4002]);
    expect(denied.socket.sent).toHaveLength(3);
    denied.client.disconnect();
    const timeout = await heartbeatSession();
    await timeout.advance(19_999);
    expect(timeout.socket.closeCodes).toEqual([]);
    await timeout.advance(1);
    expect(timeout.socket.closeCodes).toEqual([4001]);
    expect(timeout.socket.sent).toHaveLength(3);
    timeout.client.disconnect();
  });

  it("gives a retry its normal timeout while presence remains fresh", async () => {
    const { client, socket, advance } = await heartbeatSession();
    await advance(10_000);
    await rejectLastRequest(socket, true);
    await advance(500);
    expect(socket.sent).toHaveLength(4);
    await advance(19_999);
    expect(socket.closeCodes).toEqual([]);
    await advance(1);
    expect(socket.closeCodes).toEqual([4001]);
    client.disconnect();
  });

  it("does not send a retry with too little time left for a response", async () => {
    const { client, socket, advance } = await heartbeatSession();
    await rejectLastRequest(socket, true, 14_000);
    await advance(14_000);
    await advance(19_200);
    await rejectLastRequest(socket, true);
    expect(socket.sent).toHaveLength(4);
    expect(socket.closeCodes).toEqual([4003]);
    client.disconnect();
  });

  it("does not extend the deadline for a server retry-after beyond the remaining budget", async () => {
    const { client, socket } = await heartbeatSession();
    await rejectLastRequest(socket, true, 60_000);
    expect(socket.sent).toHaveLength(3);
    expect(socket.closeCodes).toEqual([4003]);
    client.disconnect();
  });

  it("does not send a delayed retry after tab suspension exhausts its deadline", async () => {
    const { client, socket, advance, suspend } = await heartbeatSession();
    await rejectLastRequest(socket, true);
    suspend(60_000);
    await advance(500);
    expect(socket.sent).toHaveLength(3);
    expect(socket.closeCodes).toEqual([4003]);
    client.disconnect();
  });

  it("cancels the old heartbeat retry when navigation disconnects the document", async () => {
    const { client, socket, sockets, advance } = await heartbeatSession();
    await rejectLastRequest(socket, true);
    client.disconnect();
    await advance(60_000);
    expect(socket.sent).toHaveLength(3);
    expect(socket.closeCodes).toEqual([1000]);
    expect(sockets).toHaveLength(1);
    expect(client.state).toBe("disconnected");
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
