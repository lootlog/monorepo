import type { GameEvent } from "@lootlog/margonem/game-events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MargonemRuntimeBridge } from "./margonem-runtime-bridge";
import type { MargonemRuntimeAdapter } from "./runtime-adapter";

describe("MargonemRuntimeBridge", () => {
  const runtimeWindow = window as Window & {
    successData?: (this: unknown, ...args: unknown[]) => unknown;
  };
  const originalSuccessData = runtimeWindow.successData;
  const originalRequest = testRuntimeWindow._g;
  const originalEngine = testRuntimeWindow.Engine;

  afterEach(() => {
    runtimeWindow.successData = originalSuccessData;
    testRuntimeWindow._g = originalRequest;
    testRuntimeWindow.Engine = originalEngine;
  });

  it("observes an event only after Margonem returns without changing the call", () => {
    const order: string[] = [];
    const event = Object.freeze({ h: { stasis: 1 } }) as GameEvent;
    const callback = vi.fn();
    const receiver = { runtime: true };
    const original = vi.fn(function (this: unknown, ...args: unknown[]) {
      order.push("margonem");
      expect(this).toBe(receiver);
      expect(args).toEqual([event, callback]);
      return "unchanged-result";
    });
    runtimeWindow.successData = original;
    const bridge = new MargonemRuntimeBridge({ interface: "si" });
    bridge.subscribeApplied(() => order.push("applied"));

    expect(bridge.install()).toBe(true);
    expect(bridge.getHealth()).toEqual(
      expect.objectContaining({ seam: "si:successData", status: "ready" }),
    );
    const result = runtimeWindow.successData?.call(receiver, event, callback);

    expect(result).toBe("unchanged-result");
    expect(order).toEqual(["margonem", "applied"]);
    expect(original).toHaveBeenCalledWith(event, callback);
    bridge.cleanup();
  });

  it("runs the one-time initialization callback before the first Margonem event", () => {
    const order: string[] = [];
    runtimeWindow.successData = vi.fn(() => {
      order.push("margonem");
    });
    const bridge = new MargonemRuntimeBridge({ interface: "si" });
    bridge.setGameInitCallback(() => {
      order.push("bootstrap");
      return true;
    });
    bridge.subscribeApplied(() => order.push("applied"));
    bridge.install();

    runtimeWindow.successData?.({ h: {} });
    runtimeWindow.successData?.({ h: {} });

    expect(order).toEqual([
      "bootstrap",
      "margonem",
      "applied",
      "margonem",
      "applied",
    ]);
    bridge.cleanup();
  });

  it("delivers distinct applied packets that share an event id", () => {
    const firstEvent = Object.freeze({
      ev: 1_785_091_976.123,
      f: { m: ["turn-1"] },
    }) as GameEvent;
    const secondEvent = Object.freeze({
      ev: 1_785_091_976.123,
      f: { m: ["turn-2"] },
    }) as GameEvent;
    const original = vi.fn(() => "margonem-result");
    runtimeWindow.successData = original;
    const bridge = new MargonemRuntimeBridge({ interface: "si" });
    const applied = vi.fn();
    bridge.subscribeApplied(applied);

    bridge.install();
    runtimeWindow.successData?.(firstEvent);
    runtimeWindow.successData?.(secondEvent);

    expect(applied).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ raw: firstEvent }),
    );
    expect(applied).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ raw: secondEvent }),
    );
    expect(original).toHaveBeenCalledTimes(2);
    expect(applied).toHaveBeenCalledTimes(2);
    bridge.cleanup();
  });

  it("keeps distinct event ids and events without ids", () => {
    runtimeWindow.successData = vi.fn();
    const bridge = new MargonemRuntimeBridge({ interface: "si" });
    const applied = vi.fn();
    bridge.subscribeApplied(applied);

    bridge.install();
    runtimeWindow.successData?.({ ev: 1, f: { m: ["first"] } });
    runtimeWindow.successData?.({ ev: 2, f: { m: ["second"] } });
    runtimeWindow.successData?.({ f: { m: ["without-id"] } });
    runtimeWindow.successData?.({ f: { m: ["without-id"] } });

    expect(applied).toHaveBeenCalledTimes(4);
    bridge.cleanup();
  });

  it("observes every applied packet without owning a work queue", () => {
    runtimeWindow.successData = vi.fn();
    const bridge = new MargonemRuntimeBridge({ interface: "si" });
    const applied = vi.fn();
    bridge.subscribeApplied(applied);

    bridge.install();
    const firstEvent = { ev: 10, f: { m: ["first"] } };
    const secondEvent = { ev: 10, f: { m: ["second"] } };
    runtimeWindow.successData?.(firstEvent);
    runtimeWindow.successData?.(secondEvent);

    expect(applied).toHaveBeenCalledTimes(2);
    expect(applied).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ raw: firstEvent }),
    );
    expect(applied).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ raw: secondEvent }),
    );
    bridge.cleanup();
  });

  it("does not expose applied observer failures to Margonem callers", () => {
    const event = Object.freeze({ h: { stasis: 1 } }) as GameEvent;
    const observerFailure = new Error("observer failed");
    const original = vi.fn(() => "margonem-result");
    runtimeWindow.successData = original;
    const bridge = new MargonemRuntimeBridge({ interface: "si" });
    const laterObserver = vi.fn();
    bridge.subscribeApplied(() => {
      throw observerFailure;
    });
    bridge.subscribeApplied(laterObserver);

    bridge.install();
    expect(() => runtimeWindow.successData?.(event)).not.toThrow();
    expect(runtimeWindow.successData?.(event)).toBe("margonem-result");
    expect(laterObserver).toHaveBeenCalledTimes(2);
    bridge.cleanup();
  });

  it("reports observer failures without allowing reporter failures to escape", () => {
    const event = Object.freeze({ h: { stasis: 1 } }) as GameEvent;
    const observerFailure = new Error("observer failed");
    const onObserverError = vi.fn(() => {
      throw new Error("reporter failed");
    });
    runtimeWindow.successData = vi.fn(() => "margonem-result");
    const bridge = new MargonemRuntimeBridge({
      interface: "si",
      onObserverError,
    } as never);
    bridge.subscribeApplied(() => {
      throw observerFailure;
    });

    bridge.install();
    expect(runtimeWindow.successData?.(event)).toBe("margonem-result");
    expect(onObserverError).toHaveBeenCalledWith({
      error: observerFailure,
      phase: "applied",
      sequence: 1,
    });
    bridge.cleanup();
  });

  it("calls Margonem unchanged when creating an applied envelope fails", () => {
    const envelopeFailure = new Error("event access failed");
    const event = new Proxy(
      {},
      {
        get() {
          throw envelopeFailure;
        },
      },
    ) as GameEvent;
    const callback = vi.fn();
    const receiver = { runtime: true };
    const original = vi.fn(function (this: unknown, ...args: unknown[]) {
      expect(this).toBe(receiver);
      expect(args[0]).toBe(event);
      expect(args[1]).toBe(callback);
      return "margonem-result";
    });
    const onObserverError = vi.fn();
    runtimeWindow.successData = original;
    const bridge = new MargonemRuntimeBridge({
      interface: "si",
      onObserverError,
    });

    bridge.install();
    const result = runtimeWindow.successData?.call(receiver, event, callback);

    expect(result).toBe("margonem-result");
    expect(onObserverError).toHaveBeenCalledWith({
      error: envelopeFailure,
      phase: "applied",
      sequence: 1,
    });
    bridge.cleanup();
  });

  it("publishes a talk intent without modifying any outgoing request value", () => {
    runtimeWindow.successData = vi.fn();
    const payload = Object.freeze({ answer: "yes" });
    const callback = vi.fn();
    const receiver = { request: true };
    const original = vi.fn(function (this: unknown, ...args: unknown[]) {
      expect(this).toBe(receiver);
      expect(args[0]).toBe("talk&id=501&c=2");
      expect(args[1]).toBe(callback);
      expect(args[2]).toBe(payload);
      return payload;
    });
    testRuntimeWindow._g = original;
    const bridge = new MargonemRuntimeBridge({ interface: "si" });
    const intents = vi.fn();
    bridge.subscribeIntent(intents);

    bridge.install();
    const result = testRuntimeWindow._g.call(
      receiver,
      "talk&id=501&c=2",
      callback,
      payload,
    );

    expect(result).toBe(payload);
    expect(intents).toHaveBeenCalledOnce();
    expect(intents).toHaveBeenCalledWith({
      npc: null,
      npcId: 501,
      type: "talk",
    });
    bridge.cleanup();
  });

  it("does not expose intent observer failures to outgoing Margonem requests", () => {
    runtimeWindow.successData = vi.fn();
    const callback = vi.fn();
    const payload = Object.freeze({ answer: "yes" });
    const receiver = { request: true };
    const original = vi.fn(function (this: unknown, ...args: unknown[]) {
      expect(this).toBe(receiver);
      expect(args).toEqual(["talk&id=501", callback, payload]);
      return payload;
    });
    testRuntimeWindow._g = original;
    const bridge = new MargonemRuntimeBridge({ interface: "si" });
    const laterObserver = vi.fn();
    bridge.subscribeIntent(() => {
      throw new Error("intent observer failed");
    });
    bridge.subscribeIntent(laterObserver);

    bridge.install();
    const result = testRuntimeWindow._g.call(
      receiver,
      "talk&id=501",
      callback,
      payload,
    );

    expect(result).toBe(payload);
    expect(laterObserver).toHaveBeenCalledOnce();
    bridge.cleanup();
  });

  it("consumes a talk intent after applied observers finish with failures", () => {
    runtimeWindow.successData = vi.fn();
    testRuntimeWindow._g = vi.fn();
    const bridge = new MargonemRuntimeBridge({ interface: "si" });
    const applied = vi.fn();
    bridge.subscribeApplied(applied);
    bridge.subscribeApplied(() => {
      throw new Error("applied observer failed");
    });

    bridge.install();
    testRuntimeWindow._g("talk&id=501");
    runtimeWindow.successData?.({ h: {} });
    runtimeWindow.successData?.({ h: {} });

    expect(applied.mock.calls[0]?.[0].ingress.intent).toEqual({
      npc: null,
      npcId: 501,
      type: "talk",
    });
    expect(applied.mock.calls[1]?.[0].ingress.intent).toBeNull();
    bridge.cleanup();
  });

  it("preserves a new talk intent observed while applied handlers run", () => {
    runtimeWindow.successData = vi.fn();
    testRuntimeWindow._g = vi.fn();
    const bridge = new MargonemRuntimeBridge({ interface: "si" });
    const applied = vi.fn();
    bridge.subscribeApplied((envelope) => {
      applied(envelope);
      if (envelope.sequence === 1) testRuntimeWindow._g?.("talk&id=502");
    });

    bridge.install();
    testRuntimeWindow._g("talk&id=501");
    runtimeWindow.successData?.({ h: {} });
    runtimeWindow.successData?.({ h: {} });

    expect(applied.mock.calls[0]?.[0].ingress.intent?.npcId).toBe(501);
    expect(applied.mock.calls[1]?.[0].ingress.intent?.npcId).toBe(502);
    bridge.cleanup();
  });

  it("consumes a talk intent after a successful packet that cannot be observed", () => {
    runtimeWindow.successData = vi.fn(() => "margonem-result");
    testRuntimeWindow._g = vi.fn();
    const bridge = new MargonemRuntimeBridge({ interface: "si" });
    const applied = vi.fn();
    bridge.subscribeApplied(applied);

    bridge.install();
    testRuntimeWindow._g("talk&id=501");
    runtimeWindow.successData?.("not-json");
    runtimeWindow.successData?.({ h: {} });

    expect(applied).toHaveBeenCalledOnce();
    expect(applied.mock.calls[0]?.[0].ingress.intent).toBeNull();
    bridge.cleanup();
  });

  it("uses NI parseJSON and does not emit applied when Margonem throws", () => {
    const failure = new Error("game failed");
    const parseJSON = vi.fn(() => {
      throw failure;
    });
    const successData = vi.fn();
    testRuntimeWindow.Engine = {
      communication: { parseJSON, successData },
    };
    const bridge = new MargonemRuntimeBridge({ interface: "ni" });
    const applied = vi.fn();
    bridge.subscribeApplied(applied);
    bridge.install();

    const installedParseJson = testRuntimeWindow.Engine?.communication
      ?.parseJSON as (event: GameEvent) => unknown;
    expect(() => installedParseJson({ h: {} })).toThrow(failure);
    expect(applied).not.toHaveBeenCalled();
    expect(successData).not.toHaveBeenCalled();
    bridge.cleanup();
  });

  it("preserves NI parseJSON arguments, receiver, and return value", () => {
    const event = Object.freeze({ h: { x: 4, y: 5 } }) as GameEvent;
    const callback = vi.fn();
    const receiver = { communication: true };
    const result = Object.freeze({ ok: true });
    const parseJSON = vi.fn(function (this: unknown, ...args: unknown[]) {
      expect(this).toBe(receiver);
      expect(args).toEqual([event, callback]);
      return result;
    });
    testRuntimeWindow.Engine = {
      communication: { parseJSON },
    };
    const bridge = new MargonemRuntimeBridge({ interface: "ni" });
    const applied = vi.fn();
    bridge.subscribeApplied(applied);
    bridge.install();

    const installedParseJson = testRuntimeWindow.Engine?.communication
      ?.parseJSON as (this: unknown, ...args: unknown[]) => unknown;
    expect(installedParseJson.call(receiver, event, callback)).toBe(result);
    expect(applied).toHaveBeenCalledWith(
      expect.objectContaining({ raw: event }),
    );
    bridge.cleanup();
  });

  it("deduplicates the NI send fallback and preserves foreign replacements during cleanup", () => {
    const send = vi.fn((value) => value);
    testRuntimeWindow.Engine = {
      communication: { parseJSON: vi.fn(), send },
    };
    testRuntimeWindow._g = vi.fn((value) => value);
    const bridge = new MargonemRuntimeBridge({ interface: "ni" });
    const intents = vi.fn();
    bridge.subscribeIntent(intents);
    bridge.install();

    testRuntimeWindow._g("talk&id=501");
    send("talk&id=501");
    expect(intents).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith("talk&id=501");

    const foreignOutgoing = vi.fn();
    testRuntimeWindow._g = foreignOutgoing;
    bridge.cleanup();
    expect(testRuntimeWindow._g).toBe(foreignOutgoing);
  });

  it("never reads Margonem domain state while receiving an event", () => {
    const adapter = {
      getGameSnapshot: vi.fn(),
      getNpc: vi.fn(),
      getOther: vi.fn(),
    } as unknown as MargonemRuntimeAdapter;
    runtimeWindow.successData = vi.fn();
    const bridge = new MargonemRuntimeBridge({ adapter, interface: "si" });
    const applied = vi.fn();
    bridge.subscribeApplied(applied);
    bridge.install();

    runtimeWindow.successData?.({
      f: { w: { "11": {}, "-90": {} } },
      npcs: Array.from({ length: 120 }, (_, id) => ({ id })),
      npcs_del: [{ id: 7 }],
    } as unknown as GameEvent);

    expect(adapter.getGameSnapshot).not.toHaveBeenCalled();
    expect(adapter.getNpc).not.toHaveBeenCalled();
    expect(adapter.getOther).not.toHaveBeenCalled();
    expect(applied.mock.calls[0]?.[0].ingress).toEqual({
      game: null,
      intent: null,
      npcsById: {},
      othersById: {},
    });
    bridge.cleanup();
  });

  it("does not read a game snapshot for AFK, deletion, or loot facts", () => {
    const adapter = {
      getGameSnapshot: vi.fn(),
      getNpc: vi.fn(() => undefined),
      getOther: vi.fn(() => undefined),
    } as unknown as MargonemRuntimeAdapter;
    runtimeWindow.successData = vi.fn();
    const bridge = new MargonemRuntimeBridge({ adapter, interface: "si" });
    const applied = vi.fn();
    bridge.subscribeApplied(applied);
    bridge.install();

    runtimeWindow.successData?.({ h: { x: 5, y: 6 } } as GameEvent);
    expect(adapter.getGameSnapshot).not.toHaveBeenCalled();
    expect(applied.mock.calls[0]?.[0].ingress.game).toBeNull();

    runtimeWindow.successData?.({ h: { stasis: 1 } } as GameEvent);
    runtimeWindow.successData?.({ npcs_del: [{ id: 7 }] } as GameEvent);
    runtimeWindow.successData?.({
      item: {},
      loot: { source: "dialog" },
    } as unknown as GameEvent);

    expect(adapter.getGameSnapshot).not.toHaveBeenCalled();
    expect(applied.mock.calls[1]?.[0].ingress.game).toBeNull();
    expect(applied.mock.calls[2]?.[0].ingress.game).toBeNull();
    expect(applied.mock.calls[3]?.[0].ingress.game).toBeNull();
    bridge.cleanup();
  });
});
import { testRuntimeWindow } from "@/test/test-runtime-window";
