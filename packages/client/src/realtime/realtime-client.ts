import {
  decodeRealtimeFrame,
  isServerEventFrame,
  PRESENCE_HEARTBEAT_INTERVAL_MS,
  PRESENCE_EXPIRY_MS,
  REALTIME_PROTOCOL_VERSION,
  REALTIME_CLIENT_CLOSE_CODES,
  type ClientCommand,
  type ServerEvent,
  type SubscriptionScope,
} from "@lootlog/protocol/realtime";
import {
  encodeRealtimeFrame,
  tryDecodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import { Result } from "effect";
import { reportListenerError } from "./report-listener-error.js";

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
  send(data: string | Uint8Array<ArrayBuffer>): void;
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
  readonly frameEncoding?: "json" | "messagepack";
  readonly requestTimeoutMs?: number;
  readonly reconnectBaseDelayMs?: number;
  readonly reconnectMaxDelayMs?: number;
  readonly random?: () => number;
  readonly webSocketFactory?: RealtimeWebSocketFactory;
}

interface PendingRequest {
  readonly type: CommandType;
  readonly startedAt: number;
  readonly resolve: (data: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
}

class RealtimeRequestTimeout extends Error {}

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
  new WebSocket(url, protocols);

const WEBSOCKET_OPEN = 1;

const MIN_HEARTBEAT_RETRY_BUDGET_MS = 2_000;

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
  private readonly frameEncoding: "json" | "messagepack";
  private readonly eventListeners = new Set<(event: ServerEvent) => void>();
  private readonly stateListeners = new Set<
    (state: RealtimeConnectionState) => void
  >();
  private heartbeatLatencyMs: number | null = null;
  private readonly heartbeatLatencyListeners = new Set<
    (latencyMs: number | null) => void
  >();
  private readonly pending = new Map<string, PendingRequest>();
  private readonly subscriptions = new Map<string, SubscriptionScope>();
  private socket: RealtimeWebSocket | null = null;
  private stateValue: RealtimeConnectionState = "disconnected";
  private joinData: CommandData<"session.join"> | null = null;
  private joinAttempt: {
    readonly socket: RealtimeWebSocket;
    readonly key: string;
    readonly promise: Promise<unknown>;
  } | null = null;
  private reconnectAttempt = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private presenceSessionId: string | null = null;
  private presenceRefreshedAt = 0;
  private manuallyClosed = false;
  private messageChain = Promise.resolve();
  private rejoinHandler: (() => Promise<void>) | null = null;

  constructor(options: RealtimeClientOptions) {
    this.url = normalizeUrl(options.url, options.path ?? "/ws");
    this.protocols = options.protocols ? [...options.protocols] : undefined;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 20_000;
    this.reconnectBaseDelayMs = options.reconnectBaseDelayMs ?? 1_000;
    this.reconnectMaxDelayMs = options.reconnectMaxDelayMs ?? 30_000;
    this.random = options.random ?? Math.random;
    this.webSocketFactory = options.webSocketFactory ?? nativeWebSocketFactory;
    this.frameEncoding = options.frameEncoding ?? "messagepack";
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

  subscribeHeartbeatLatency(
    listener: (latencyMs: number | null) => void,
  ): () => void {
    this.heartbeatLatencyListeners.add(listener);
    listener(this.heartbeatLatencyMs);

    return () => this.heartbeatLatencyListeners.delete(listener);
  }

  private setHeartbeatLatency(latencyMs: number | null): void {
    this.heartbeatLatencyMs = latencyMs;

    for (const listener of this.heartbeatLatencyListeners) {
      try {
        listener(latencyMs);
      } catch (error) {
        reportListenerError({ source: "heartbeat latency", error });
      }
    }
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
    return this.requestWithTimeout(type, data, this.requestTimeoutMs);
  }

  private requestWithTimeout<Type extends CommandType>(
    type: Type,
    data: CommandData<Type>,
    timeoutMs: number,
  ): ReturnType<RealtimeClient["request"]> {
    const activeSocket = this.socket;

    if (!activeSocket || activeSocket.readyState !== WEBSOCKET_OPEN) {
      return Promise.reject(new Error("Realtime connection is not open"));
    }

    const requestId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(
          new RealtimeRequestTimeout(`Realtime request timed out: ${type}`),
        );
      }, timeoutMs);

      this.pending.set(requestId, {
        type,
        startedAt: performance.now(),
        resolve,
        reject,
        timeout,
      });

      try {
        // SAFETY: the command discriminator and payload are coupled by CommandData<Type>.
        activeSocket.send(
          this.encodeFrame({
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
    // SAFETY: the command discriminator and payload are coupled by CommandData<Type>.
    activeSocket.send(
      this.encodeFrame({
        v: REALTIME_PROTOCOL_VERSION,
        type,
        data,
      } as ClientCommand),
    );
  }

  private open(state: "connecting" | "reconnecting"): void {
    this.setState(state);

    if (this.manuallyClosed) return;
    const socket = this.webSocketFactory(this.url, this.protocols);
    socket.binaryType = "arraybuffer";
    this.socket = socket;
    socket.addEventListener("open", () => {
      if (this.socket !== socket) return;
      this.setState("connected");

      // A synchronous observer suppresses only the default join. Explicit restore
      // handlers can also refresh HTTP data or publish presence and must still run.
      if (
        this.joinData &&
        (this.rejoinHandler || this.stateValue === "connected")
      ) {
        const rejoin =
          this.rejoinHandler ??
          (() => this.performJoin().then(() => undefined));

        void rejoin().catch(() =>
          socket.close(
            REALTIME_CLIENT_CLOSE_CODES.sessionJoinFailed,
            "session rejoin failed",
          ),
        );
      }
    });
    socket.addEventListener("message", (event) => {
      this.messageChain = this.messageChain
        .then(() => this.handleMessage(event.data))
        .catch(() =>
          socket.close(
            REALTIME_CLIENT_CLOSE_CODES.malformedFrame,
            "malformed realtime frame",
          ),
        );
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

  private performJoin(data = this.joinData): Promise<unknown> {
    const socket = this.socket;

    if (!data || !socket || !this.connected) return Promise.resolve(undefined);
    const key = JSON.stringify(data);
    const pending = this.joinAttempt;

    if (pending?.socket === socket) {
      if (pending.key === key) return pending.promise;

      // The game client can replace an unverified session with a proof-bearing
      // join. Serialize that update instead of discarding its new credentials.
      return pending.promise.then(() => {
        if (this.socket !== socket || !this.connected)
          throw new Error("Realtime connection changed before queued join");

        return this.performJoin(data);
      });
    }

    const promise = this.restoreSession(
      socket,
      this.request("session.join", data),
    );

    this.joinAttempt = { socket, key, promise };
    this.setState("joining");

    return promise;
  }

  private async restoreSession(
    socket: RealtimeWebSocket,
    joined: Promise<unknown>,
  ): ReturnType<RealtimeClient["join"]> {
    try {
      const result = await joined;

      if (this.socket !== socket) return result;
      await Promise.all(
        [...this.subscriptions.values()].map((scope) =>
          this.request("subscription.subscribe", scope),
        ),
      );

      if (this.socket !== socket) return result;
      this.reconnectAttempt = 0;
      this.setState("ready");

      return result;
    } catch (error) {
      if (this.socket === socket) {
        if (error instanceof RealtimeRequestError && !error.retryable) {
          this.manuallyClosed = true;
          this.clearReconnect();
        }

        socket.close(
          REALTIME_CLIENT_CLOSE_CODES.sessionJoinFailed,
          "session join failed",
        );
      }

      throw error;
    } finally {
      if (this.joinAttempt?.socket === socket) this.joinAttempt = null;
    }
  }

  private async handleMessage(data: unknown): Promise<void> {
    const frame = await this.decodeFrame(data);

    if ("status" in frame) {
      const pending = this.pending.get(frame.requestId);

      if (!pending) return;
      clearTimeout(pending.timeout);
      this.pending.delete(frame.requestId);

      if (frame.status === "success") {
        if (pending.type === "presence.publish") {
          this.presenceSessionId = getPresenceSessionId(frame.data);
          this.presenceRefreshedAt = pending.startedAt;
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

    if (!isServerEventFrame(frame)) return;

    for (const listener of this.eventListeners) {
      try {
        listener(frame);
      } catch (error) {
        reportListenerError({ source: `server event ${frame.type}`, error });
      }
    }
  }

  private encodeFrame(frame: ClientCommand): string | Uint8Array<ArrayBuffer> {
    return this.frameEncoding === "json"
      ? JSON.stringify(frame)
      : encodeRealtimeFrame(frame);
  }

  private async decodeFrame(data: unknown) {
    if (this.frameEncoding === "json") {
      if (typeof data !== "string")
        throw new Error("Gateway returned a non-text realtime frame");

      return decodeRealtimeFrame(JSON.parse(data));
    }

    const decoded = tryDecodeRealtimeFrame(await toBytes(data));

    if (Result.isFailure(decoded)) throw decoded.failure;

    return decoded.success;
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

  private scheduleHeartbeat(
    delayMs = PRESENCE_HEARTBEAT_INTERVAL_MS,
    retryAttempt = 0,
  ): void {
    this.clearHeartbeat();

    if (!this.presenceSessionId || !this.connected) {
      this.setHeartbeatLatency(null);

      return;
    }

    this.heartbeatTimeout = setTimeout(() => {
      const sessionId = this.presenceSessionId;

      if (!sessionId) return;
      const startedAt = performance.now();
      const socket = this.socket;
      const refreshedAt = this.presenceRefreshedAt;
      const expiry = refreshedAt + PRESENCE_EXPIRY_MS;
      const remaining = expiry - startedAt;

      if (
        remaining <= 0 ||
        (retryAttempt > 0 && remaining < MIN_HEARTBEAT_RETRY_BUDGET_MS)
      ) {
        this.setHeartbeatLatency(null);
        socket?.close(
          REALTIME_CLIENT_CLOSE_CODES.heartbeatUnavailable,
          "heartbeat unavailable",
        );

        return;
      }

      void this.requestWithTimeout(
        "presence.heartbeat",
        { sessionId },
        Math.min(this.requestTimeoutMs, remaining),
      )
        .then(() => {
          if (
            this.socket !== socket ||
            this.presenceSessionId !== sessionId ||
            this.presenceRefreshedAt !== refreshedAt
          )
            return;
          this.presenceRefreshedAt = startedAt;
          this.setHeartbeatLatency(Math.round(performance.now() - startedAt));
          this.scheduleHeartbeat();
        })
        .catch((error: Error) => {
          // A publication can refresh this same session while its heartbeat is
          // in flight. Keep the publication's heartbeat schedule and lifetime.
          if (
            this.socket !== socket ||
            this.presenceSessionId !== sessionId ||
            this.presenceRefreshedAt !== refreshedAt
          )
            return;
          this.setHeartbeatLatency(null);

          // Correlated retryable responses prove the transport is alive. Back off
          // on the same session while its last successful refresh is still valid.
          if (error instanceof RealtimeRequestError && error.retryable) {
            const retryDelay = Math.max(
              Math.round(
                Math.min(5_000, 1_000 * 2 ** retryAttempt) *
                  (0.5 + this.random()),
              ),
              error.retryAfterMs ?? 0,
            );

            if (
              expiry - performance.now() - retryDelay >=
              MIN_HEARTBEAT_RETRY_BUDGET_MS
            ) {
              this.scheduleHeartbeat(retryDelay, retryAttempt + 1);

              return;
            }

            socket?.close(
              REALTIME_CLIENT_CLOSE_CODES.heartbeatUnavailable,
              "heartbeat unavailable",
            );

            return;
          }

          if (error instanceof RealtimeRequestTimeout) {
            socket?.close(
              REALTIME_CLIENT_CLOSE_CODES.heartbeatTimeout,
              "heartbeat timeout",
            );

            return;
          }

          if (error instanceof RealtimeRequestError) {
            socket?.close(
              REALTIME_CLIENT_CLOSE_CODES.heartbeatRejected,
              "heartbeat rejected",
            );

            return;
          }

          socket?.close();
        });
    }, delayMs);
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

    if (state === "disconnected") this.setHeartbeatLatency(null);

    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (error) {
        reportListenerError({ source: `connection state ${state}`, error });
      }
    }
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
