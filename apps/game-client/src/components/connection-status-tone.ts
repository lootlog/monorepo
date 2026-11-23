import type { RealtimeConnectionStatus } from "@/lib/realtime-connection-status";

type ConnectionTone = "neutral" | "success" | "warning";

export const CONNECTION_STATUS_TONE = {
  online: "success",
  connecting: "neutral",
  reconnecting: "warning",
  unreachable: "warning",
} as const satisfies Record<RealtimeConnectionStatus, ConnectionTone>;

export const SIGNED_OUT_CONNECTION_TONE = "warning" satisfies ConnectionTone;

export const CONNECTION_TONE_TEXT_CLASS_NAME = {
  neutral: "ll:text-muted-foreground",
  success: "ll:text-success",
  warning: "ll:text-warning",
} as const satisfies Record<ConnectionTone, string>;

export const CONNECTION_TONE_DOT_CLASS_NAME = {
  neutral: "ll:bg-muted-foreground",
  success: "ll:bg-success",
  warning: "ll:bg-warning",
} as const satisfies Record<ConnectionTone, string>;
