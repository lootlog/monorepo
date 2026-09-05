import { afterEach, describe, expect, it, vi } from "vitest";
import { RealtimeRequestError } from "@lootlog/client/realtime";
import { createPageTransport } from "./page-transport";
import {
  decodeMessage,
  encodeMessage,
  ExtensionRequestSchema,
  type ExtensionMessage,
  type ExtensionRequest,
} from "./protocol";

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function setup() {
  const channel = new MessageChannel();
  const received: ExtensionRequest[] = [];
  const waiters: Array<(request: ExtensionRequest) => void> = [];
  const queue: ExtensionRequest[] = [];
  channel.port2.onmessage = (event: MessageEvent<unknown>) => {
    const request = ExtensionRequestSchema.parse(decodeMessage(event.data));
    received.push(request);
    const waiter = waiters.shift();
    if (waiter) waiter(request);
    else queue.push(request);
  };
  channel.port2.start();
  const closed = vi.fn();
  const platform = createPageTransport(channel.port1, closed);
  cleanups.push(() => {
    platform.dispose();
    channel.port2.close();
  });
  return {
    platform,
    closed,
    received,
    next: () =>
      new Promise<ExtensionRequest>((resolve) => {
        const queued = queue.shift();
        if (queued) resolve(queued);
        else waiters.push(resolve);
      }),
    send: (message: ExtensionMessage) =>
      channel.port2.postMessage(encodeMessage(message)),
  };
}

const httpResponse = (status = 200, body = '{"saved":true}') => ({
  status,
  statusText: "",
  headers: { "content-type": "application/json" },
  body,
});

describe("page transport", () => {
  it("does not restart an in-flight connection when the initial ready arrives", async () => {
    const bridge = setup();
    bridge.platform.createRealtime().connect();
    const initial = await bridge.next();
    expect(initial.type).toBe("connect");
    bridge.send({ type: "ready" });
    bridge.send({ type: "result", id: initial.id, data: null });
    const result = bridge.platform.fetch("https://lootlog.pl/api/timers");
    const next = await bridge.next();
    expect(next.type).toBe("http");
    bridge.send({ type: "result", id: next.id, data: httpResponse() });
    await result;
    expect(
      bridge.received.filter((request) => request.type === "connect"),
    ).toHaveLength(1);
  });

  it("serializes HTTP through the port and reconstructs the response", async () => {
    const bridge = setup();
    const result = bridge.platform.fetch("https://lootlog.pl/api/loots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"loot":1}',
    });
    const request = await bridge.next();
    expect(request).toMatchObject({
      type: "http",
      request: {
        url: "https://lootlog.pl/api/loots",
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"loot":1}',
      },
    });
    bridge.send({ type: "result", id: request.id, data: httpResponse(201) });
    const response = await result;
    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({ saved: true });
  });

  it("reconstructs a bodyless 204 response", async () => {
    const bridge = setup();
    const result = bridge.platform.fetch("https://lootlog.pl/api/timers", {
      method: "DELETE",
    });
    const request = await bridge.next();
    bridge.send({
      type: "result",
      id: request.id,
      data: httpResponse(204, ""),
    });
    const response = await result;
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("preserves HTTP error status and retry headers for the API client", async () => {
    const bridge = setup();
    const result = bridge.platform.fetch("https://lootlog.pl/api/timers");
    const request = await bridge.next();
    bridge.send({
      type: "result",
      id: request.id,
      data: {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "retry-after": "5" },
        body: '{"error":"rate limited"}',
      },
    });
    const response = await result;
    expect(response.ok).toBe(false);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("5");
    expect(await response.json()).toEqual({ error: "rate limited" });
  });

  it("propagates transport errors without turning them into HTTP responses", async () => {
    const bridge = setup();
    const result = bridge.platform.fetch("https://lootlog.pl/api/timers");
    const rejection = expect(result).rejects.toThrow("Network unavailable");
    const request = await bridge.next();
    bridge.send({
      type: "error",
      id: request.id,
      message: "Network unavailable",
    });
    await rejection;
  });

  it("sends cancellation and rejects with AbortError", async () => {
    const bridge = setup();
    const controller = new AbortController();
    const result = bridge.platform.fetch("https://lootlog.pl/api/timers", {
      signal: controller.signal,
    });
    const rejection = expect(result).rejects.toMatchObject({
      name: "AbortError",
    });
    const request = await bridge.next();
    controller.abort();
    await rejection;
    expect(await bridge.next()).toEqual({ type: "cancel", id: request.id });
  });

  it("rejects uncertain mutations on reset without replay and ignores their late results", async () => {
    const bridge = setup();
    const result = bridge.platform.fetch("https://lootlog.pl/api/loots", {
      method: "POST",
      body: "{}",
    });
    const rejection = expect(result).rejects.toThrow("outcome may be unknown");
    const oldRequest = await bridge.next();
    bridge.send({ type: "reset" });
    await rejection;
    bridge.send({ type: "ready" });
    bridge.send({ type: "result", id: oldRequest.id, data: httpResponse(201) });
    const nextResult = bridge.platform.fetch("https://lootlog.pl/api/timers");
    const nextRequest = await bridge.next();
    expect(nextRequest).toMatchObject({
      type: "http",
      request: { method: "GET" },
    });
    expect(nextRequest.id).not.toBe(oldRequest.id);
    bridge.send({
      type: "result",
      id: nextRequest.id,
      data: httpResponse(200, "[]"),
    });
    expect(await (await nextResult).json()).toEqual([]);
    expect(
      bridge.received.filter((request) => request.type === "http"),
    ).toHaveLength(2);
  });

  it("rejects pending and future requests when disposed", async () => {
    const bridge = setup();
    const result = bridge.platform.fetch("https://lootlog.pl/api/timers");
    const rejection = expect(result).rejects.toThrow("disconnected");
    await bridge.next();
    bridge.platform.dispose();
    await rejection;
    await expect(
      bridge.platform.fetch("https://lootlog.pl/api/timers"),
    ).rejects.toThrow("disposed");
  });

  it("rejects future requests after the background closes the document connection", async () => {
    const bridge = setup();
    bridge.send({ type: "closed" });
    await vi.waitFor(() => expect(bridge.closed).toHaveBeenCalledOnce());
    await expect(
      bridge.platform.fetch("https://lootlog.pl/api/timers"),
    ).rejects.toThrow();
    expect(
      bridge.received.filter((request) => request.type === "http"),
    ).toHaveLength(0);
  });

  it("isolates subscriber exceptions from pending HTTP mutations", async () => {
    const bridge = setup();
    const realtime = bridge.platform.createRealtime();
    const listener = vi.fn();
    realtime.subscribe(() => {
      throw new Error("Broken UI subscriber");
    });
    realtime.subscribe(listener);
    const result = bridge.platform.fetch("https://lootlog.pl/api/loots", {
      method: "POST",
      body: "{}",
    });
    const request = await bridge.next();
    const event = {
      v: 1,
      type: "permissions.updated",
      data: { organizationIds: [], subscriptionScopes: [] },
    };
    bridge.send({ type: "event", event });
    bridge.send({ type: "result", id: request.id, data: httpResponse(201) });
    expect((await result).status).toBe(201);
    expect(listener).toHaveBeenCalledWith(event);
  });

  it("forwards realtime commands and structured retryable errors", async () => {
    const bridge = setup();
    const realtime = bridge.platform.createRealtime();
    const join = realtime.join({ world: "jaruna" });
    const request = await bridge.next();
    expect(request).toMatchObject({
      type: "command",
      command: { v: 1, type: "session.join", data: { world: "jaruna" } },
    });
    bridge.send({ type: "result", id: request.id, data: { joined: true } });
    await expect(join).resolves.toEqual({ joined: true });
    const heartbeat = realtime.request("presence.heartbeat", {
      sessionId: "session",
    });
    const rejection = expect(heartbeat).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryable: true,
      retryAfterMs: 1000,
    });
    const heartbeatRequest = await bridge.next();
    expect(heartbeatRequest).toMatchObject({
      command: { type: "presence.heartbeat", data: { sessionId: "session" } },
    });
    bridge.send({
      type: "error",
      id: heartbeatRequest.id,
      message: "Wait",
      code: "RATE_LIMITED",
      retryable: true,
      retryAfterMs: 1000,
    });
    await rejection;
    await expect(heartbeat).rejects.toBeInstanceOf(RealtimeRequestError);
  });

  it("delivers realtime state and events and honors unsubscription", async () => {
    const bridge = setup();
    const realtime = bridge.platform.createRealtime();
    const states = vi.fn();
    const events = vi.fn();
    const unsubscribe = realtime.subscribe(events);
    realtime.subscribeState(states);
    expect(states).toHaveBeenCalledWith("disconnected");
    const event = {
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "connection",
        organizationIds: [],
        subscriptionScopes: [],
      },
    };
    bridge.send({ type: "state", state: "ready" });
    bridge.send({ type: "event", event });
    await vi.waitFor(() => expect(events).toHaveBeenCalledWith(event));
    expect(states).toHaveBeenLastCalledWith("ready");
    unsubscribe();
    bridge.send({ type: "event", event });
    bridge.send({ type: "closed" });
    await vi.waitFor(() => expect(bridge.closed).toHaveBeenCalledOnce());
    expect(events).toHaveBeenCalledTimes(1);
  });
});
