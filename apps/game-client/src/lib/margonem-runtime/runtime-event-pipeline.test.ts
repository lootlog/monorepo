import { describe, expect, it, vi } from "vitest";
import type { RuntimeEventEnvelope } from "./runtime.types";
import { RuntimeEventPipeline } from "./runtime-event-pipeline";

const emptyIngress = Object.freeze({
  game: null,
  intent: null,
  npcsById: Object.freeze({}),
  othersById: Object.freeze({}),
});

function createEnvelope(sequence: number): RuntimeEventEnvelope {
  return Object.freeze({
    facts: Object.freeze([]),
    ingress: emptyIngress,
    observedAt: sequence,
    raw: { h: { x: sequence } },
    sequence,
  });
}

describe("RuntimeEventPipeline", () => {
  it("drains every queued event in one task after Margonem returns", () => {
    const order: string[] = [];
    const scheduled: Array<() => void> = [];
    let applied: ((envelope: RuntimeEventEnvelope) => void) | undefined;
    const projection = {
      apply: vi.fn((envelope: RuntimeEventEnvelope) => {
        order.push(`project:${envelope.sequence}`);
      }),
      captureIngress: vi.fn((envelope: RuntimeEventEnvelope) => {
        order.push(`ingress:${envelope.sequence}`);
        return envelope;
      }),
    };
    const pipeline = new RuntimeEventPipeline({
      bridge: {
        subscribeApplied: (handler) => {
          applied = handler;
          return vi.fn();
        },
      },
      projection,
      schedule: (callback) => {
        scheduled.push(callback);
        return scheduled.length;
      },
      cancel: vi.fn(),
    });
    pipeline.acquireProcessor((envelope) => {
      order.push(`dispatch:${envelope.sequence}`);
    });
    pipeline.install();
    pipeline.setReady(true);

    order.push("margonem:start");
    applied?.(createEnvelope(1));
    applied?.(createEnvelope(2));
    order.push("margonem:return");

    expect(order).toEqual(["margonem:start", "margonem:return"]);
    expect(scheduled).toHaveLength(1);

    scheduled[0]?.();

    expect(scheduled).toHaveLength(1);
    expect(order).toEqual([
      "margonem:start",
      "margonem:return",
      "ingress:1",
      "project:1",
      "dispatch:1",
      "ingress:2",
      "project:2",
      "dispatch:2",
    ]);
  });

  it("buffers applied events until the initial snapshot is ready", () => {
    const scheduled: Array<() => void> = [];
    let applied: ((envelope: RuntimeEventEnvelope) => void) | undefined;
    const processor = vi.fn();
    const pipeline = new RuntimeEventPipeline({
      bridge: {
        subscribeApplied: (handler) => {
          applied = handler;
          return vi.fn();
        },
      },
      projection: {
        apply: vi.fn(),
        captureIngress: (envelope) => envelope,
      },
      schedule: (callback) => {
        scheduled.push(callback);
        return scheduled.length;
      },
      cancel: vi.fn(),
    });
    pipeline.acquireProcessor(processor);
    pipeline.install();

    applied?.(createEnvelope(1));
    expect(scheduled).toHaveLength(0);

    pipeline.setReady(true);
    expect(scheduled).toHaveLength(1);
    scheduled[0]?.();
    expect(processor).toHaveBeenCalledOnce();
  });

  it("shares one processor across overlapping registrations", () => {
    let applied: ((envelope: RuntimeEventEnvelope) => void) | undefined;
    const firstProcessor = vi.fn();
    const secondProcessor = vi.fn();
    const pipeline = new RuntimeEventPipeline({
      bridge: {
        subscribeApplied: (handler) => {
          applied = handler;
          return vi.fn();
        },
      },
      projection: {
        apply: vi.fn(),
        captureIngress: (envelope) => envelope,
      },
    });
    const releaseFirst = pipeline.acquireProcessor(firstProcessor);
    const releaseSecond = pipeline.acquireProcessor(secondProcessor);
    pipeline.install();
    pipeline.setReady(true);

    applied?.(createEnvelope(1));
    pipeline.flush();
    expect(firstProcessor).toHaveBeenCalledOnce();
    expect(secondProcessor).not.toHaveBeenCalled();

    expect(releaseFirst()).toBe(false);
    applied?.(createEnvelope(2));
    pipeline.flush();
    expect(firstProcessor).toHaveBeenCalledTimes(2);

    expect(releaseSecond()).toBe(true);
    applied?.(createEnvelope(3));
    pipeline.flush();
    expect(firstProcessor).toHaveBeenCalledTimes(2);
  });
});
