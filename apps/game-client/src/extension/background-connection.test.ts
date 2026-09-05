import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RealtimeClient,
  type RealtimeWebSocket,
} from "@lootlog/client/realtime";
import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import { API_URL, AUTH_API_URL } from "@/config/api";
import { createBackgroundConnection } from "./background-connection";
import {
  decodeMessage,
  encodeMessage,
  ExtensionMessageSchema,
  type ExtensionRequest,
} from "./protocol";

class Socket implements RealtimeWebSocket {
  private readonly target = new EventTarget();
  binaryType: BinaryType = "arraybuffer";
  readyState = 0;
  sent: Uint8Array[] = [];
  addEventListener(
    type: "open" | "close" | "message" | "error",
    listener: (event: { readonly data?: unknown }) => void,
  ) {
    this.target.addEventListener(type, (event) =>
      listener(event instanceof MessageEvent ? { data: event.data } : {}),
    );
  }
  send(data: string | Uint8Array) {
    if (typeof data === "string") throw new Error("Expected binary protocol");
    this.sent.push(data);
  }
  open() {
    this.readyState = 1;
    this.target.dispatchEvent(new Event("open"));
  }
  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.target.dispatchEvent(new Event("close"));
  }
  respond(data: unknown) {
    const bytes = this.sent.at(-1);
    if (bytes === undefined) throw new Error("No request sent");
    const frame = decodeRealtimeFrame(bytes);
    if (!("requestId" in frame) || !frame.requestId)
      throw new Error("Expected request ID");
    this.target.dispatchEvent(
      new MessageEvent("message", {
        data: encodeRealtimeFrame({
          v: 1,
          requestId: frame.requestId,
          status: "success",
          data,
        }),
      }),
    );
  }
}

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.restoreAllMocks();
});

function setup() {
  const socket = new Socket();
  const factory = vi.fn(() => socket);
  const realtime = new RealtimeClient({
    url: "https://gateway.lootlog.pl",
    webSocketFactory: factory,
    ticketProvider: () => Promise.resolve("private-ticket"),
  });
  const messages: ReturnType<typeof ExtensionMessageSchema.parse>[] = [];
  const connection = createBackgroundConnection(realtime, (raw) =>
    messages.push(ExtensionMessageSchema.parse(decodeMessage(raw))),
  );
  cleanups.push(() => connection.dispose());
  return {
    socket,
    messages,
    factory,
    connection,
    receive: (request: ExtensionRequest) =>
      connection.receive(encodeMessage(request)),
  };
}

describe("background connection", () => {
  it("keeps the ticket in the socket handshake and handles validated join and presence commands", async () => {
    const bridge = setup();
    await bridge.receive({ type: "connect", id: "connect" });
    await vi.waitFor(() => expect(bridge.factory).toHaveBeenCalledOnce());
    bridge.socket.open();
    const join = bridge.receive({
      type: "command",
      id: "join",
      command: {
        v: 1,
        type: "session.join",
        data: {
          world: "jaruna",
          margonemAccountProof: { proof: "current-document" },
        },
      },
    });
    bridge.socket.respond({ organizationIds: ["organization"] });
    await join;
    const presence = bridge.receive({
      type: "command",
      id: "presence",
      command: {
        v: 1,
        type: "presence.fetch",
        data: { organizationId: "organization", world: "jaruna" },
      },
    });
    bridge.socket.respond({ presences: [] });
    await presence;
    expect(bridge.messages).toContainEqual({
      type: "result",
      id: "presence",
      data: { presences: [] },
    });
    expect(bridge.messages).toContainEqual({ type: "state", state: "ready" });
    expect(JSON.stringify(bridge.messages)).not.toContain("private-ticket");
    expect(JSON.stringify(bridge.factory.mock.calls)).toContain(
      "lootlog.ticket.v1.",
    );
    expect(
      bridge.socket.sent.map((frame) => decodeRealtimeFrame(frame)),
    ).toEqual([
      expect.objectContaining({
        type: "session.join",
        data: {
          world: "jaruna",
          margonemAccountProof: { proof: "current-document" },
        },
      }),
      expect.objectContaining({
        type: "presence.fetch",
        data: { organizationId: "organization", world: "jaruna" },
      }),
    ]);
  });

  it.each([
    { v: 1, type: "session.join", data: { world: 42 } },
    { v: 1, type: "presence.heartbeat", data: { sessionId: "session" } },
    {
      v: 1,
      type: "permissions.updated",
      data: { organizationIds: [], subscriptionScopes: [] },
    },
    { v: 1, requestId: "fake", status: "success", data: {} },
  ])(
    "rejects invalid or unsupported page commands before sending to the socket",
    async (command) => {
      const bridge = setup();
      await bridge.receive({ type: "command", id: "invalid", command });
      expect(bridge.messages).toContainEqual(
        expect.objectContaining({ type: "error", id: "invalid" }),
      );
      expect(bridge.socket.sent).toHaveLength(0);
    },
  );

  it("denies page access to the realtime ticket endpoint", async () => {
    const bridge = setup();
    const fetcher = vi.spyOn(globalThis, "fetch");
    await bridge.receive({
      type: "http",
      id: "ticket",
      request: {
        url: `${AUTH_API_URL}/auth/realtime-ticket`,
        method: "POST",
        headers: {},
      },
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(bridge.messages).toContainEqual(
      expect.objectContaining({ type: "error", id: "ticket" }),
    );
  });

  it("aborts HTTP when its document disconnects and suppresses stale responses", async () => {
    const bridge = setup();
    let requestSignal: AbortSignal | null | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      requestSignal = init?.signal;
      return new Promise((_resolve, reject) =>
        requestSignal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        ),
      );
    });
    const pending = bridge.receive({
      type: "http",
      id: "pending",
      request: {
        url: `${API_URL}/loots`,
        method: "POST",
        headers: {},
        body: "{}",
      },
    });
    bridge.connection.dispose();
    await pending;
    expect(requestSignal?.aborted).toBe(true);
    expect(
      bridge.messages.filter(
        (message) => "id" in message && message.id === "pending",
      ),
    ).toHaveLength(0);
  });

  it("executes a pending mutation ID only once", async () => {
    const bridge = setup();
    const response = Promise.withResolvers<Response>();
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(response.promise);
    const request: ExtensionRequest = {
      type: "http",
      id: "same",
      request: {
        url: `${API_URL}/loots`,
        method: "POST",
        headers: {},
        body: "{}",
      },
    };
    const first = bridge.receive(request);
    await bridge.receive(request);
    response.resolve(Response.json({ id: 1 }));
    await first;
    expect(fetcher).toHaveBeenCalledOnce();
    expect(
      bridge.messages.filter(
        (message) => "id" in message && message.id === "same",
      ),
    ).toHaveLength(1);
  });
});
