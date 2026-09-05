import { decodeRealtimeFrame } from "@lootlog/protocol/realtime";
import {
  RealtimeRequestError,
  type RealtimeClient,
} from "@lootlog/client/realtime";
import { executeExtensionHttp } from "./http";
import {
  ExtensionRequestSchema,
  encodeMessage,
  decodeMessage,
  MAX_PENDING_REQUESTS,
  REQUEST_TIMEOUT_MS,
  type ExtensionMessage,
} from "./protocol";

export function createBackgroundConnection(
  realtime: RealtimeClient,
  postMessage: (message: string) => void,
) {
  const pending = new Map<string, AbortController>();
  let disposed = false;
  const send = (message: ExtensionMessage) => {
    if (!disposed) postMessage(encodeMessage(message));
  };
  // Rejoining needs a fresh proof from the current game document, never the old proof.
  realtime.setReconnectHandler(async () => {});
  const unsubscribeEvents = realtime.subscribe((event) =>
    send({ type: "event", event }),
  );
  const unsubscribeState = realtime.subscribeState((state) =>
    send({ type: "state", state }),
  );

  return {
    async receive(raw: unknown): Promise<void> {
      if (disposed) return;
      const parsed = ExtensionRequestSchema.safeParse(decodeMessage(raw));
      if (!parsed.success) throw new Error("Invalid extension request");
      const message = parsed.data;
      if (message.type === "cancel") {
        pending.get(message.id)?.abort();
        return;
      }
      if (pending.has(message.id)) return;
      if (pending.size >= MAX_PENDING_REQUESTS) {
        send({
          type: "error",
          id: message.id,
          message: "Too many pending extension requests",
        });
        return;
      }
      const controller = new AbortController();
      pending.set(message.id, controller);
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        let result: unknown;
        switch (message.type) {
          case "http":
            result = await executeExtensionHttp(
              message.request,
              controller.signal,
            );
            break;
          case "connect":
            realtime.connect();
            break;
          case "disconnect":
            realtime.disconnect();
            break;
          case "release":
            realtime.disconnect();
            send({ type: "closed" });
            break;
          case "command":
            result = await executeGameCommand(realtime, message.command);
            break;
        }
        if (!controller.signal.aborted)
          send({ type: "result", id: message.id, data: result ?? null });
      } catch (error) {
        if (!controller.signal.aborted)
          send({
            type: "error",
            id: message.id,
            message:
              error instanceof Error
                ? error.message
                : "Extension request failed",
            ...(error instanceof RealtimeRequestError
              ? {
                  code: error.code,
                  retryable: error.retryable,
                  retryAfterMs: error.retryAfterMs,
                }
              : {}),
          });
      } finally {
        clearTimeout(timeout);
        pending.delete(message.id);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribeEvents();
      unsubscribeState();
      realtime.disconnect();
      for (const controller of pending.values()) controller.abort();
      pending.clear();
    },
  };
}

function executeGameCommand(
  realtime: RealtimeClient,
  command: unknown,
): Promise<unknown> {
  const frame = decodeRealtimeFrame(command);
  if ("status" in frame) throw new Error("Expected a client command");
  switch (frame.type) {
    case "session.join":
      return realtime.join(frame.data);
    case "presence.publish":
    case "presence.fetch":
    case "map-ping.send":
    case "air-tag.subscription":
    case "air-tag.observation":
      return realtime.request(frame.type, frame.data);
    default:
      throw new Error("Unsupported game command");
  }
}
