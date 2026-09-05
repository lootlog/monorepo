import { z } from "zod";
import {
  RealtimeRequestError,
  type RealtimeConnectionState,
  type ServerEvent,
} from "@lootlog/client/realtime";
import { decodeServerEvent } from "@lootlog/protocol/realtime";
import type {
  GameClientPlatform,
  GameRealtimeClient,
} from "@/lib/game-client-platform";
import {
  EXTENSION_CHANNEL,
  ExtensionMessageSchema,
  encodeMessage,
  decodeMessage,
  MAX_PENDING_REQUESTS,
  REQUEST_TIMEOUT_MS,
  type ExtensionRequest,
} from "./protocol";

const HttpResponseSchema = z.object({
  status: z.number().int().min(200).max(599),
  statusText: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.string(),
});
type Pending = {
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
  cleanup: () => void;
};
type RequestData = ExtensionRequest extends infer R
  ? R extends ExtensionRequest
    ? Omit<R, "id">
    : never
  : never;

export function createPageTransport(
  port: MessagePort,
  onClosed: () => void,
): GameClientPlatform & { dispose: () => void } {
  const pending = new Map<string, Pending>();
  const events = new Set<(event: ServerEvent) => void>();
  const states = new Set<(state: RealtimeConnectionState) => void>();
  let state: RealtimeConnectionState = "disconnected";
  let disposed = false;
  let wantsConnection = false;
  let connectionRequested = false;
  let hasJoined = false;
  let reconnectHandler: (() => Promise<void>) | null = null;

  const setState = (next: RealtimeConnectionState) => {
    state = next;
    for (const listener of states) {
      try {
        listener(next);
      } catch {
        /* Isolate UI observers from transport delivery. */
      }
    }
  };
  const failPending = () => {
    for (const request of pending.values()) {
      request.cleanup();
      request.reject(
        new Error(
          "Extension transport disconnected; request outcome may be unknown",
        ),
      );
    }
    pending.clear();
  };
  const send = (request: ExtensionRequest) =>
    port.postMessage(encodeMessage(request));
  const request = (
    data: RequestData,
    signal?: AbortSignal,
  ): Promise<unknown> => {
    if (disposed)
      return Promise.reject(new Error("Extension transport disposed"));
    if (signal?.aborted)
      return Promise.reject(new DOMException("Request aborted", "AbortError"));
    if (pending.size >= MAX_PENDING_REQUESTS)
      return Promise.reject(new Error("Too many pending extension requests"));
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const cancel = (error: Error) => {
        const active = pending.get(id);
        if (!active) return;
        pending.delete(id);
        active.cleanup();
        try {
          send({ type: "cancel", id });
        } catch {
          /* The channel may already be closed. */
        }
        reject(error);
      };
      const abort = () =>
        cancel(new DOMException("Request aborted", "AbortError"));
      const timeout = setTimeout(
        () =>
          cancel(
            new Error(
              "Extension request timed out; request outcome may be unknown",
            ),
          ),
        REQUEST_TIMEOUT_MS,
      );
      const cleanup = () => {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
      };
      pending.set(id, { resolve, reject, cleanup });
      signal?.addEventListener("abort", abort, { once: true });
      try {
        send({ ...data, id });
      } catch (error) {
        pending.delete(id);
        cleanup();
        reject(error);
      }
    });
  };
  const connect = () => {
    wantsConnection = true;
    if (connectionRequested) return;
    connectionRequested = true;
    void request({ type: "connect" }).catch(() => {
      connectionRequested = false;
      setState("disconnected");
    });
  };
  const disconnect = () => {
    wantsConnection = false;
    connectionRequested = false;
    void request({ type: "disconnect" }).catch(() => {});
    setState("disconnected");
  };
  const realtime: GameRealtimeClient = {
    connect,
    disconnect,
    join: (data) => {
      hasJoined = true;
      return request({
        type: "command",
        command: { v: 1, type: "session.join", data },
      });
    },
    request: (type, data) =>
      request({ type: "command", command: { v: 1, type, data } }),
    subscribe: (listener) => {
      events.add(listener);
      return () => {
        events.delete(listener);
      };
    },
    subscribeState: (listener) => {
      states.add(listener);
      listener(state);
      return () => {
        states.delete(listener);
      };
    },
    setReconnectHandler: (handler) => {
      reconnectHandler = handler;
    },
  };

  port.onmessage = (event: MessageEvent<unknown>) => {
    if (disposed) return;
    try {
      const message = ExtensionMessageSchema.parse(decodeMessage(event.data));
      switch (message.type) {
        case "ready":
          if (wantsConnection) connect();
          return;
        case "reset":
          failPending();
          connectionRequested = false;
          setState("disconnected");
          return;
        case "closed":
          dispose();
          onClosed();
          return;
        case "state": {
          const reconnect =
            message.state === "connected" && hasJoined && reconnectHandler;
          setState(message.state);
          if (reconnect) void reconnect().catch(disconnect);
          return;
        }
        case "event": {
          const frame = decodeServerEvent(message.event);
          for (const listener of events) {
            try {
              listener(frame);
            } catch {
              /* Isolate UI observers from transport delivery. */
            }
          }
          return;
        }
        case "result":
        case "error": {
          const active = pending.get(message.id);
          if (!active) return;
          pending.delete(message.id);
          active.cleanup();
          if (message.type === "result") active.resolve(message.data);
          else
            active.reject(
              message.code
                ? new RealtimeRequestError(
                    message.code,
                    message.message,
                    message.retryable ?? false,
                    message.retryAfterMs,
                  )
                : new Error(message.message),
            );
        }
      }
    } catch {
      failPending();
      setState("disconnected");
    }
  };
  port.start();

  function dispose() {
    if (disposed) return;
    disconnect();
    try {
      send({ type: "release", id: crypto.randomUUID() });
    } catch {
      /* Already disconnected. */
    }
    disposed = true;
    failPending();
    port.onmessage = null;
    port.close();
    events.clear();
    states.clear();
  }

  return {
    createRealtime: () => realtime,
    fetch: async (input, init) => {
      const nativeRequest = new Request(input, init);
      const url = new URL(nativeRequest.url);
      // These game-owned requests must retain Margonem's cookies and request semantics.
      if (
        ["public-api.margonem.pl", "public-api.margonem.com"].includes(
          url.hostname,
        ) &&
        url.protocol === "https:"
      )
        return globalThis.fetch(input, init);
      const data = await request(
        {
          type: "http",
          request: {
            url: nativeRequest.url,
            method: nativeRequest.method,
            headers: Object.fromEntries(nativeRequest.headers.entries()),
            ...(nativeRequest.method === "GET" ||
            nativeRequest.method === "HEAD"
              ? {}
              : { body: await nativeRequest.text() }),
          },
        },
        nativeRequest.signal,
      );
      const response = HttpResponseSchema.parse(data);
      return new Response(
        [204, 205, 304].includes(response.status) ||
          nativeRequest.method === "HEAD"
          ? null
          : response.body,
        response,
      );
    },
    dispose,
  };
}

export function connectPageTransport(
  onClosed: () => void,
): ReturnType<typeof createPageTransport> {
  const channel = new MessageChannel();
  const transport = createPageTransport(channel.port1, onClosed);
  window.postMessage({ channel: EXTENSION_CHANNEL }, window.location.origin, [
    channel.port2,
  ]);
  return transport;
}
