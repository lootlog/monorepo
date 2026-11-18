import { REALTIME_INBOUND_TIMEOUT_CLOSE_CODE } from "@lootlog/protocol/realtime";
import { Effect, Schedule } from "effect";
import type { SessionData } from "./session.js";

export const INBOUND_PROBE_INTERVAL_MS = 25_000;

/** Three probe intervals, so a closed socket ignored at least two pings. */
export const INBOUND_SILENCE_LIMIT_MS = 3 * INBOUND_PROBE_INTERVAL_MS;

export type LivenessSocket = Pick<
  Bun.ServerWebSocket<SessionData>,
  "ping" | "close"
>;

/**
 * Closes connections whose peer stopped sending.
 *
 * Bun's `idleTimeout` restarts on every frame the server sends, so a socket
 * that keeps receiving events never idles, even when its peer vanished behind
 * the proxy without closing. Only inbound frames prove the peer is there.
 */
export class InboundLiveness {
  private readonly lastInboundAt = new Map<LivenessSocket, number>();

  constructor(
    private readonly now: () => number = performance.now.bind(performance),
  ) {}

  /** Call on open and on every message, ping, or pong from the peer. */
  inbound(socket: LivenessSocket): void {
    this.lastInboundAt.set(socket, this.now());
  }

  close(socket: LivenessSocket): void {
    this.lastInboundAt.delete(socket);
  }

  sweep(): void {
    const now = this.now();

    for (const [socket, lastInboundAt] of this.lastInboundAt) {
      const silentFor = now - lastInboundAt;

      if (silentFor >= INBOUND_SILENCE_LIMIT_MS) {
        // The close callback can run later; never close the same socket twice.
        this.lastInboundAt.delete(socket);
        socket.close(REALTIME_INBOUND_TIMEOUT_CLOSE_CODE, "inbound timeout");
      } else if (silentFor >= INBOUND_PROBE_INTERVAL_MS) {
        // Sockets without a client heartbeat only answer with pongs.
        socket.ping();
      }
    }
  }

  run(): Effect.Effect<void> {
    return Effect.sync(() => this.sweep()).pipe(
      Effect.repeat(Schedule.spaced(INBOUND_PROBE_INTERVAL_MS)),
      Effect.asVoid,
    );
  }
}
