import { Effect } from "effect";
import {
  yieldToEventLoop,
  type BackgroundTaskRunner,
} from "#src/platform/background-tasks";
import type { GatewaySocket } from "#src/realtime/session";

type Message = string | Buffer;

interface Limits {
  readonly connections?: number;
  readonly cleanupActive?: number;
  readonly active: number;
  readonly messages: number;
  readonly bytes: number;
  readonly connectionMessages: number;
  readonly connectionBytes: number;
}

const defaultLimits = {
  connections: 16_384,
  cleanupActive: 8,
  active: 64,
  messages: 16_384,
  bytes: 16 * 1_024 * 1_024,
  // A reconnect restores up to 4096 subscriptions in one client burst.
  connectionMessages: 4_112,
  // Include 4096 maximum-size scopes plus their command envelopes on restore.
  connectionBytes: 8 * 1_024 * 1_024,
} satisfies Limits;

interface Connection {
  readonly socket: GatewaySocket;
  readonly messages: Array<{ readonly input: Message; readonly bytes: number }>;
  bytes: number;
  pending: number;
  running: boolean;
  closed: boolean;
}

/** Admission happens before decoding or allocating command fibers. */
export class CommandIngress {
  private readonly connections = new Map<GatewaySocket, Connection>();
  private readonly ready = new Set<Connection>();
  private readonly cleanupReady = new Set<Connection>();
  private active = 0;
  private cleanupActive = 0;
  private rejectedConnections = 0;
  private pending = 0;
  private bytes = 0;
  private rejected = 0;
  private draining = false;

  constructor(
    private readonly handle: (
      socket: GatewaySocket,
      input: Message,
    ) => Effect.Effect<void>,
    private readonly reject: (socket: GatewaySocket, input: Message) => void,
    private readonly disconnect: (
      socket: GatewaySocket,
    ) => Effect.Effect<void, unknown>,
    private readonly runBackground: BackgroundTaskRunner,
    private readonly limits: Limits = defaultLimits,
  ) {}

  open(socket: GatewaySocket): boolean {
    const existing = this.connections.get(socket);

    if (existing) return !existing.closed;

    // Reserve lifecycle capacity until ordered cleanup finishes. Otherwise a
    // stalled cleanup dependency lets reconnect churn retain unlimited sockets.
    if (
      this.connections.size >=
      (this.limits.connections ?? defaultLimits.connections)
    ) {
      this.rejectedConnections++;

      return false;
    }

    this.connections.set(socket, {
      socket,
      messages: [],
      bytes: 0,
      pending: 0,
      running: false,
      closed: false,
    });

    return true;
  }

  message(socket: GatewaySocket, input: Message): void {
    const connection = this.connections.get(socket);

    if (!connection || connection.closed) return;
    const bytes = Buffer.byteLength(input);

    if (
      this.pending >= this.limits.messages ||
      connection.pending >= this.limits.connectionMessages ||
      this.bytes + bytes > this.limits.bytes ||
      connection.bytes + bytes > this.limits.connectionBytes
    ) {
      this.rejected += 1;
      this.reject(socket, input);

      return;
    }

    connection.messages.push({ input, bytes });
    connection.pending += 1;
    connection.bytes += bytes;
    this.pending += 1;
    this.bytes += bytes;

    if (!connection.running) this.ready.add(connection);
    this.drain();
  }

  close(socket: GatewaySocket): void {
    const connection = this.connections.get(socket);

    if (!connection || connection.closed) return;
    connection.closed = true;

    if (!connection.running && connection.pending === 0)
      this.cleanupReady.add(connection);
    this.drain();
  }

  getDiagnostics() {
    let maxConnectionPending = 0;
    let closingConnections = 0;

    for (const connection of this.connections.values()) {
      maxConnectionPending = Math.max(maxConnectionPending, connection.pending);

      if (connection.closed) closingConnections++;
    }

    return {
      active: this.active,
      cleanupActive: this.cleanupActive,
      retainedConnections: this.connections.size,
      closingConnections,
      rejectedConnections: this.rejectedConnections,
      pending: this.pending,
      bytes: this.bytes,
      rejected: this.rejected,
      maxConnectionPending,
    };
  }

  private drain(): void {
    if (this.draining) return;
    this.draining = true;

    try {
      while (true) {
        const cleanup =
          this.cleanupActive <
            (this.limits.cleanupActive ?? defaultLimits.cleanupActive) &&
          this.cleanupReady.size > 0;

        if (!cleanup && this.active >= this.limits.active) break;
        const queue = cleanup ? this.cleanupReady : this.ready;
        const connection = queue.values().next().value;

        if (!connection) break;
        queue.delete(connection);
        const message = connection.messages.shift();
        connection.running = true;

        if (cleanup) this.cleanupActive += 1;
        else this.active += 1;
        this.runBackground(
          message ? "websocket.message" : "websocket.disconnect",
          // Yield to network/probe callbacks even when commands complete synchronously.
          yieldToEventLoop.pipe(
            Effect.andThen(
              Effect.suspend(() =>
                message
                  ? this.handle(connection.socket, message.input)
                  : this.disconnect(connection.socket),
              ),
            ),
            Effect.ensuring(
              Effect.sync(() => {
                if (cleanup) this.cleanupActive -= 1;
                else this.active -= 1;
                connection.running = false;

                if (message) {
                  this.pending -= 1;
                  this.bytes -= message.bytes;
                  connection.pending -= 1;
                  connection.bytes -= message.bytes;

                  if (connection.messages.length > 0)
                    this.ready.add(connection);
                  else if (connection.closed) this.cleanupReady.add(connection);
                } else {
                  this.connections.delete(connection.socket);
                }

                this.drain();
              }),
            ),
          ),
        );
      }
    } finally {
      this.draining = false;
    }
  }
}
