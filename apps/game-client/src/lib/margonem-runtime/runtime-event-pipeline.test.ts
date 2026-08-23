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

  it("drops the whole buffer after overflowing before initialization", () => {
    let applied: ((envelope: RuntimeEventEnvelope) => void) | undefined;
    const processor = vi.fn();
    const onOverflow = vi.fn();
    const pipeline = new RuntimeEventPipeline({
      bridge: {
        subscribeApplied: (handler) => {
          applied = handler;
          return vi.fn();
        },
      },
      onOverflow,
      projection: {
        apply: vi.fn(),
        captureIngress: (envelope) => envelope,
      },
    });
    pipeline.acquireProcessor(processor);
    pipeline.install();

    for (let sequence = 1; sequence <= 1_001; sequence += 1) {
      applied?.(createEnvelope(sequence));
    }
    applied?.(createEnvelope(1_002));
    pipeline.setReady(true);
    pipeline.flush();

    expect(onOverflow).toHaveBeenCalledOnce();
    expect(processor).not.toHaveBeenCalled();
  });

  it("continues after the processing error reporter throws", () => {
    let applied: ((envelope: RuntimeEventEnvelope) => void) | undefined;
    const projected = vi.fn();
    const processor = vi.fn((envelope: RuntimeEventEnvelope) => {
      if (envelope.sequence === 1) {
        throw new Error("processor failed");
      }
    });
    const onProcessingError = vi.fn(() => {
      throw new Error("reporter failed");
    });
    const pipeline = new RuntimeEventPipeline({
      bridge: {
        subscribeApplied: (handler) => {
          applied = handler;
          return vi.fn();
        },
      },
      onProcessingError,
      projection: {
        apply: vi.fn(),
        captureIngress: (envelope) => envelope,
      },
    });
    pipeline.acquireProcessor(processor);
    pipeline.subscribeProjected(projected);
    pipeline.install();
    pipeline.setReady(true);

    applied?.(createEnvelope(1));
    applied?.(createEnvelope(2));

    expect(() => pipeline.flush()).not.toThrow();
    expect(processor).toHaveBeenCalledTimes(2);
    expect(projected).toHaveBeenCalledTimes(2);
    expect(onProcessingError).toHaveBeenCalledOnce();
  });

  it("defers events enqueued while the current drain task is running", () => {
    const scheduled: Array<() => void> = [];
    let applied: ((envelope: RuntimeEventEnvelope) => void) | undefined;
    const processor = vi.fn((envelope: RuntimeEventEnvelope) => {
      if (envelope.sequence === 1) {
        applied?.(createEnvelope(2));
      }
    });
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
    pipeline.setReady(true);
    applied?.(createEnvelope(1));

    scheduled[0]?.();

    expect(processor).toHaveBeenCalledOnce();
    expect(scheduled).toHaveLength(2);

    scheduled[1]?.();

    expect(processor).toHaveBeenCalledTimes(2);
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
