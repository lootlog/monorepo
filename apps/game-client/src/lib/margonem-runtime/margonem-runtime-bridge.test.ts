import type { GameEvent } from "@lootlog/margonem/game-events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MargonemRuntimeBridge } from "./margonem-runtime-bridge";
import type { MargonemRuntimeAdapter } from "./runtime-adapter";

describe("MargonemRuntimeBridge", () => {
  const runtimeWindow = window as Window & {
    successData?: (this: unknown, ...args: unknown[]) => unknown;
  };
  const originalSuccessData = runtimeWindow.successData;
  const originalRequest = window._g;
  const originalEngine = window.Engine;

  afterEach(() => {
    runtimeWindow.successData = originalSuccessData;
    window._g = originalRequest;
    window.Engine = originalEngine;
  });

  it("observes an incoming event before Margonem and an applied event afterwards without changing the call", () => {
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
    bridge.subscribeIncoming(() => order.push("incoming"));
    bridge.subscribeApplied(() => order.push("applied"));

    expect(bridge.install()).toBe(true);
    expect(bridge.getHealth()).toEqual(
      expect.objectContaining({ seam: "si:successData", status: "ready" }),
    );
    bridge.setReady(true);
    const result = runtimeWindow.successData?.call(receiver, event, callback);

    expect(result).toBe("unchanged-result");
    expect(order).toEqual(["incoming", "margonem", "applied"]);
    expect(original).toHaveBeenCalledWith(event, callback);
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
    window._g = original;
    const bridge = new MargonemRuntimeBridge({ interface: "si" });
    const intents = vi.fn();
    bridge.subscribeIntent(intents);

    bridge.install();
    const result = window._g.call(
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

  it("uses NI parseJSON and does not emit applied when Margonem throws", () => {
    const failure = new Error("game failed");
    const parseJSON = vi.fn(() => {
      throw failure;
    });
    const successData = vi.fn();
    window.Engine = {
      communication: { parseJSON, successData },
    } as never;
    const bridge = new MargonemRuntimeBridge({ interface: "ni" });
    const incoming = vi.fn();
    const applied = vi.fn();
    bridge.subscribeIncoming(incoming);
    bridge.subscribeApplied(applied);
    bridge.install();
    bridge.setReady(true);

    expect(() =>
      (
        window.Engine.communication as unknown as {
          parseJSON: (event: GameEvent) => unknown;
        }
      ).parseJSON({ h: {} }),
    ).toThrow(failure);
    expect(incoming).toHaveBeenCalledOnce();
    expect(applied).not.toHaveBeenCalled();
    expect(successData).not.toHaveBeenCalled();
    bridge.cleanup();
  });

  it("deduplicates the NI send fallback and preserves foreign replacements during cleanup", () => {
    const send = vi.fn((value) => value);
    window.Engine = {
      communication: { parseJSON: vi.fn(), send },
    } as never;
    window._g = vi.fn((value) => value);
    const bridge = new MargonemRuntimeBridge({ interface: "ni" });
    const intents = vi.fn();
    bridge.subscribeIntent(intents);
    bridge.install();

    window._g("talk&id=501");
    (
      window.Engine.communication as unknown as {
        send: (command: string) => unknown;
      }
    ).send("talk&id=501");
    expect(intents).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith("talk&id=501");

    const foreignOutgoing = vi.fn();
    window._g = foreignOutgoing;
    bridge.cleanup();
    expect(window._g).toBe(foreignOutgoing);
  });

  it("captures only referenced ingress entities and keeps queued snapshots historical", () => {
    const firstNpc = Object.freeze({ id: 7, name: "Before" });
    const getNpc = vi.fn<() => Readonly<{ id: number; name: string }>>(
      () => firstNpc,
    );
    const getOther = vi.fn((id: string) =>
      Object.freeze({ accountId: id, characterId: id }),
    );
    const adapter = {
      getGameSnapshot: vi.fn(() => null),
      getNpc,
      getOther,
    } as unknown as MargonemRuntimeAdapter;
    runtimeWindow.successData = vi.fn();
    const bridge = new MargonemRuntimeBridge({ adapter, interface: "si" });
    const incoming = vi.fn();
    bridge.subscribeIncoming(incoming);
    bridge.install();

    runtimeWindow.successData?.({
      f: { w: { "11": {}, "-90": {} } },
      npcs: Array.from({ length: 120 }, (_, id) => ({ id })),
      npcs_del: [{ id: 7 }],
    } as unknown as GameEvent);
    getNpc.mockReturnValue(Object.freeze({ id: 7, name: "After" }));
    bridge.setReady(true);

    expect(getNpc).toHaveBeenCalledTimes(1);
    expect(getOther).toHaveBeenCalledTimes(1);
    expect(getOther).toHaveBeenCalledWith("11");
    expect(incoming.mock.calls[0]?.[0].ingress.npcsById[7]).toBe(firstNpc);
    bridge.cleanup();
  });
});
