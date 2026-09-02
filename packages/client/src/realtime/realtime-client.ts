import {
  PRESENCE_HEARTBEAT_INTERVAL_MS,
  REALTIME_PROTOCOL_VERSION,
  type ClientCommand,
  type ServerEvent,
  type SubscriptionScope,
} from "@lootlog/protocol/realtime";
import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";

type CommandType = ClientCommand["type"];
type CommandData<Type extends CommandType> = Extract<
  ClientCommand,
  { type: Type }
>["data"];

export type RealtimeConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "joining"
  | "ready"
  | "reconnecting";

export interface RealtimeWebSocket {
  binaryType: BinaryType;
  readonly readyState: number;
  addEventListener(
    type: "open" | "close" | "error" | "message",
    listener: (event: { readonly data?: unknown }) => void,
  ): void;
  send(data: Uint8Array): void;
  close(code?: number, reason?: string): void;
}

export type RealtimeWebSocketFactory = (
  url: string,
  protocols?: string[],
) => RealtimeWebSocket;

export interface RealtimeClientOptions {
  readonly url: string;
  readonly path?: string;
  readonly protocols?: ReadonlyArray<string>;
  readonly ticketProvider?: () => Promise<string | undefined>;
  readonly requestTimeoutMs?: number;
  readonly reconnectBaseDelayMs?: number;
  readonly reconnectMaxDelayMs?: number;
  readonly random?: () => number;
  readonly webSocketFactory?: RealtimeWebSocketFactory;
}

interface PendingRequest {
  readonly type: CommandType;
  readonly resolve: (data: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
}

export class RealtimeRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "RealtimeRequestError";
  }
}

const normalizeUrl = (baseUrl: string, path: string): string => {
  const fallbackBase =
    typeof globalThis.location === "undefined"
      ? "http://localhost"
      : globalThis.location.href;
  const url = new URL(baseUrl, fallbackBase);
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol === "https:") url.protocol = "wss:";
  url.pathname = path.startsWith("/") ? path : `/${path}`;
  url.search = "";
  url.hash = "";
  return url.toString();
};

const nativeWebSocketFactory: RealtimeWebSocketFactory = (url, protocols) =>
  new WebSocket(url, protocols) as RealtimeWebSocket;

const TICKET_PROTOCOL_PREFIX = "lootlog.ticket.v1.";

const encodeTicketProtocol = (ticket: string): string => {
  const bytes = new TextEncoder().encode(ticket);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${TICKET_PROTOCOL_PREFIX}${encoded}`;
};

const WEBSOCKET_OPEN = 1;

const scopeKey = (scope: SubscriptionScope): string =>
  JSON.stringify([
    scope.topic,
    scope.organizationId ?? null,
    scope.eventId ?? null,
    scope.world ?? null,
    scope.mapId ?? null,
  ]);

const toBytes = async (data: unknown): Promise<Uint8Array> => {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
  throw new Error("Gateway returned a non-binary realtime frame");
};

const getPresenceSessionId = (data: unknown): string | null => {
  if (!data || typeof data !== "object" || !("sessionId" in data)) return null;
  return typeof data.sessionId === "string" ? data.sessionId : null;
};

export class RealtimeClient {
  private readonly url: string;
  private readonly protocols?: string[];
  private readonly requestTimeoutMs: number;
  private readonly reconnectBaseDelayMs: number;
  private readonly reconnectMaxDelayMs: number;
  private readonly random: () => number;
  private readonly webSocketFactory: RealtimeWebSocketFactory;
  private readonly ticketProvider?: () => Promise<string | undefined>;
  private readonly eventListeners = new Set<(event: ServerEvent) => void>();
  private readonly stateListeners = new Set<
    (state: RealtimeConnectionState) => void
  >();
  private readonly pending = new Map<string, PendingRequest>();
  private readonly subscriptions = new Map<string, SubscriptionScope>();
  private socket: RealtimeWebSocket | null = null;
  private stateValue: RealtimeConnectionState = "disconnected";
  private joinData: CommandData<"session.join"> | null = null;
  private reconnectAttempt = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private presenceSessionId: string | null = null;
  private manuallyClosed = false;
  private messageChain = Promise.resolve();
  private rejoinHandler: (() => Promise<void>) | null = null;
  private openGeneration = 0;

  constructor(options: RealtimeClientOptions) {
    this.url = normalizeUrl(options.url, options.path ?? "/ws");
    this.protocols = options.protocols ? [...options.protocols] : undefined;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 20_000;
    this.reconnectBaseDelayMs = options.reconnectBaseDelayMs ?? 1_000;
    this.reconnectMaxDelayMs = options.reconnectMaxDelayMs ?? 30_000;
    this.random = options.random ?? Math.random;
    this.webSocketFactory = options.webSocketFactory ?? nativeWebSocketFactory;
    this.ticketProvider = options.ticketProvider;
  }

  get state(): RealtimeConnectionState {
    return this.stateValue;
  }

  get connected(): boolean {
    return this.socket?.readyState === WEBSOCKET_OPEN;
  }

  connect(): void {
    if (this.socket && this.socket.readyState <= WEBSOCKET_OPEN) return;
    this.manuallyClosed = false;
    this.clearReconnect();
    this.open(this.reconnectAttempt > 0 ? "reconnecting" : "connecting");
  }

  disconnect(): void {
    this.manuallyClosed = true;
    this.openGeneration += 1;
    this.clearReconnect();
    this.clearHeartbeat();
    this.rejectPending(new Error("Realtime client disconnected"));
    const activeSocket = this.socket;
    this.socket = null;
    activeSocket?.close(1000, "client disconnect");
    this.setState("disconnected");
  }

  subscribe(listener: (event: ServerEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  subscribeState(
    listener: (state: RealtimeConnectionState) => void,
  ): () => void {
    this.stateListeners.add(listener);
    listener(this.stateValue);
    return () => this.stateListeners.delete(listener);
  }

  setReconnectHandler(handler: (() => Promise<void>) | null): void {
    this.rejoinHandler = handler;
  }

  join(data: CommandData<"session.join">): Promise<unknown> {
    this.joinData = data;
    return this.performJoin();
  }

  subscribeScope(scope: SubscriptionScope): Promise<unknown> {
    this.subscriptions.set(scopeKey(scope), scope);
    if (!this.connected || this.stateValue !== "ready") {
      return Promise.resolve(undefined);
    }
    return this.request("subscription.subscribe", scope);
  }

  unsubscribeScope(scope: SubscriptionScope): Promise<unknown> {
    this.subscriptions.delete(scopeKey(scope));
    if (!this.connected || this.stateValue !== "ready") {
      return Promise.resolve(undefined);
    }
    return this.request("subscription.unsubscribe", scope);
  }

  request<Type extends CommandType>(
    type: Type,
    data: CommandData<Type>,
  ): Promise<unknown> {
    const activeSocket = this.socket;
    if (!activeSocket || activeSocket.readyState !== WEBSOCKET_OPEN) {
      return Promise.reject(new Error("Realtime connection is not open"));
    }
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Realtime request timed out: ${type}`));
      }, this.requestTimeoutMs);
      this.pending.set(requestId, { type, resolve, reject, timeout });
      try {
        activeSocket.send(
          encodeRealtimeFrame({
            v: REALTIME_PROTOCOL_VERSION,
            type,
            requestId,
            data,
          } as ClientCommand),
        );
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(requestId);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  send<Type extends CommandType>(type: Type, data: CommandData<Type>): void {
    const activeSocket = this.socket;
    if (!activeSocket || activeSocket.readyState !== WEBSOCKET_OPEN) return;
    activeSocket.send(
      encodeRealtimeFrame({
        v: REALTIME_PROTOCOL_VERSION,
        type,
        data,
      } as ClientCommand),
    );
  }

  private open(state: "connecting" | "reconnecting"): void {
    this.setState(state);
    const generation = ++this.openGeneration;
    if (!this.ticketProvider) {
      this.openSocket(generation, this.protocols);
      return;
    }
    void this.ticketProvider()
      .then((ticket) => {
        const protocols = ticket
          ? [...(this.protocols ?? []), encodeTicketProtocol(ticket)]
          : this.protocols;
        this.openSocket(generation, protocols);
      })
      .catch(() => {
        if (generation !== this.openGeneration || this.manuallyClosed) return;
        this.scheduleReconnect();
      });
  }

  private openSocket(generation: number, protocols?: string[]): void {
    if (generation !== this.openGeneration || this.manuallyClosed) return;
    const socket = this.webSocketFactory(this.url, protocols);
    socket.binaryType = "arraybuffer";
    this.socket = socket;
    socket.addEventListener("open", () => {
      if (this.socket !== socket) return;
      this.reconnectAttempt = 0;
      this.setState("connected");
      if (this.joinData) {
        const rejoin =
          this.rejoinHandler ??
          (() => this.performJoin().then(() => undefined));
        void rejoin().catch(() => socket.close(1008, "session rejoin failed"));
      }
    });
    socket.addEventListener("message", (event) => {
      this.messageChain = this.messageChain
        .then(() => this.handleMessage(event.data))
        .catch(() => socket.close(1007, "malformed realtime frame"));
    });
    socket.addEventListener("error", () => {
      if (this.socket === socket) socket.close();
    });
    socket.addEventListener("close", () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.clearHeartbeat();
      this.rejectPending(new Error("Realtime connection closed"));
      this.setState("disconnected");
      if (!this.manuallyClosed) this.scheduleReconnect();
    });
  }

  private async performJoin(): Promise<unknown> {
    if (!this.joinData || !this.connected) return undefined;
    this.setState("joining");
    try {
      const result = await this.request("session.join", this.joinData);
      await Promise.all(
        [...this.subscriptions.values()].map((scope) =>
          this.request("subscription.subscribe", scope),
        ),
      );
      this.setState("ready");
      return result;
    } catch (error) {
      if (this.connected) this.socket?.close(1008, "session join failed");
      throw error;
    }
  }

  private async handleMessage(data: unknown): Promise<void> {
    const frame = decodeRealtimeFrame(await toBytes(data));
    if ("status" in frame) {
      const pending = this.pending.get(frame.requestId);
      if (!pending) return;
      clearTimeout(pending.timeout);
      this.pending.delete(frame.requestId);
      if (frame.status === "success") {
        if (pending.type === "presence.publish") {
          this.presenceSessionId = getPresenceSessionId(frame.data);
          this.scheduleHeartbeat();
        }
        pending.resolve(frame.data);
      } else {
        pending.reject(
          new RealtimeRequestError(
            frame.error.code,
            frame.error.message,
            frame.error.retryable,
            frame.error.retryAfterMs,
          ),
        );
      }
      return;
    }
    if (!("type" in frame) || frame.type === "session.join") return;
    const event = frame as ServerEvent;
    for (const listener of this.eventListeners) listener(event);
  }

  private scheduleReconnect(): void {
    this.reconnectAttempt += 1;
    const exponential = Math.min(
      this.reconnectMaxDelayMs,
      this.reconnectBaseDelayMs * 2 ** (this.reconnectAttempt - 1),
    );
    const jittered = Math.round(exponential * (0.5 + this.random()));
    this.setState("reconnecting");
    this.reconnectTimeout = setTimeout(
      () => this.open("reconnecting"),
      jittered,
    );
  }

  private scheduleHeartbeat(): void {
    this.clearHeartbeat();
    if (!this.presenceSessionId || !this.connected) return;
    this.heartbeatTimeout = setTimeout(() => {
      const sessionId = this.presenceSessionId;
      if (!sessionId) return;
      void this.request("presence.heartbeat", { sessionId })
        .then(() => this.scheduleHeartbeat())
        .catch(() => this.socket?.close());
    }, PRESENCE_HEARTBEAT_INTERVAL_MS);
  }

  private rejectPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private setState(state: RealtimeConnectionState): void {
    if (this.stateValue === state) return;
    this.stateValue = state;
    for (const listener of this.stateListeners) listener(state);
  }

  private clearReconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
    this.heartbeatTimeout = null;
  }
}
