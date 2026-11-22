import { REALTIME_INBOUND_TIMEOUT_CLOSE_CODE } from "@lootlog/protocol/realtime";
import { Effect, Schedule } from "effect";
import type { SessionData } from "./session.js";

export const INBOUND_PROBE_INTERVAL_MS = 25_000;

export const INBOUND_SILENCE_LIMIT_MS = 3 * INBOUND_PROBE_INTERVAL_MS;

export type LivenessSocket = Pick<
  Bun.ServerWebSocket<SessionData>,
  "ping" | "close"
>;

export class InboundLiveness {
  private readonly lastInboundAt = new Map<LivenessSocket, number>();

  constructor(
    private readonly now: () => number = performance.now.bind(performance),
  ) {}

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
        this.lastInboundAt.delete(socket);
        socket.close(REALTIME_INBOUND_TIMEOUT_CLOSE_CODE, "inbound timeout");
      } else if (silentFor >= INBOUND_PROBE_INTERVAL_MS) {
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
