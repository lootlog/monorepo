import {
  REALTIME_CLIENT_CLOSE_CODES,
  type ClientCommand,
} from "@lootlog/protocol/realtime";
import { Effect, Metric } from "effect";
import type { GatewaySocket } from "./session.js";

const opened = Metric.counter("lootlog_gateway_connections_opened_total", {
  incremental: true,
});

const lifetime = Metric.histogram(
  "lootlog_gateway_connection_lifetime_seconds",
  {
    boundaries: [
      1,
      5,
      15,
      30,
      60,
      120,
      300,
      600,
      1_800,
      3_600,
      14_400,
      86_400,
      Infinity,
    ],
    attributes: { unit: "s" },
  },
);

const commands = Metric.counter("lootlog_gateway_commands_completed_total", {
  incremental: true,
});

const closeClassification = (code: number, reason: string) => {
  switch (code) {
    case 1000:
      return { close_code: "1000", cause: "normal" };
    case 1001:
      return { close_code: "1001", cause: "going_away" };
    case 1003:
      return { close_code: "1003", cause: "unsupported_frame" };
    case 1005:
      return { close_code: "1005", cause: "no_status" };
    case 1006:
      // Bun uses an abnormal close and this fixed reason for maxPayloadLength.
      if (reason === "Received too big message")
        return { close_code: "1006", cause: "payload_limit" };

      return { close_code: "1006", cause: "abnormal" };
    case 1007:
      return { close_code: "1007", cause: "malformed_frame" };
    case 1008:
      return { close_code: "1008", cause: "policy" };
    case 1009:
      return { close_code: "1009", cause: "payload_limit" };
    case 1011:
      return { close_code: "1011", cause: "server_error" };
    case 1012:
      return { close_code: "1012", cause: "service_restart" };
    case 1013:
      return { close_code: "1013", cause: "overload" };
    case REALTIME_CLIENT_CLOSE_CODES.heartbeatTimeout:
      return { close_code: "4001", cause: "heartbeat_timeout" };
    case REALTIME_CLIENT_CLOSE_CODES.heartbeatRejected:
      return { close_code: "4002", cause: "heartbeat_rejected" };
    case REALTIME_CLIENT_CLOSE_CODES.heartbeatUnavailable:
      return { close_code: "4003", cause: "heartbeat_unavailable" };
    case REALTIME_CLIENT_CLOSE_CODES.malformedFrame:
      return { close_code: "4007", cause: "malformed_frame" };
    case REALTIME_CLIENT_CLOSE_CODES.sessionJoinFailed:
      return { close_code: "4008", cause: "session_join_failed" };
    default:
      return { close_code: "other", cause: "other" };
  }
};

// Only decoded protocol discriminators and fixed outcomes become labels.
export const recordRealtimeCommand = (
  command: ClientCommand["type"],
  outcome: "success" | "retryable" | "rejected" | "defect" | "interrupted",
): Effect.Effect<void> =>
  Metric.update(Metric.withAttributes(commands, { command, outcome }), 1);

export class GatewayConnectionMetrics {
  private readonly openedAt = new WeakMap<GatewaySocket, number>();

  constructor(
    private readonly now: () => number = performance.now.bind(performance),
  ) {}

  open(socket: GatewaySocket): void {
    this.openedAt.set(socket, this.now());
    Effect.runSync(
      Metric.update(
        Metric.withAttributes(opened, { platform: socket.data.platform }),
        1,
      ),
    );
  }

  close(socket: GatewaySocket, code: number, reason = ""): void {
    const startedAt = this.openedAt.get(socket);

    if (startedAt === undefined) return;
    this.openedAt.delete(socket);

    // Never retain arbitrary peer reason strings, user IDs, worlds or Organizations.
    const attributes = {
      platform: socket.data.platform,
      joined: socket.data.joined ? "yes" : "no",
      ...closeClassification(code, reason),
    };

    Effect.runSync(
      Metric.update(
        Metric.withAttributes(lifetime, attributes),
        Math.max(0, this.now() - startedAt) / 1_000,
      ),
    );
  }
}
