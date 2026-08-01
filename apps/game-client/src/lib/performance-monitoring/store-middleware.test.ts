import { describe, expect, it, vi } from "vitest";
import { create } from "zustand";
import { PerformanceCollector } from "./performance-collector";
import {
  performanceStoreMiddleware,
  type StorePerformanceMeasurement,
} from "./store-middleware";

function createMeasuredStore() {
  let currentTimeMs = 0;
  const collector = new PerformanceCollector({
    now: () => currentTimeMs,
    scheduler: {
      clearTimeout: vi.fn(),
      setTimeout: vi.fn(() => 1),
    },
  });
  collector.start();
  const measurement: StorePerformanceMeasurement = {
    measure: (name, category, data, callback) =>
      collector.measure(name, category, data, () => {
        currentTimeMs += 3;
        return callback();
      }),
    record: (input) => collector.record(input),
  };
  const useStore = create<{
    items: string[];
    publish: (items: string[]) => void;
    publishNoop: () => void;
  }>()(
    performanceStoreMiddleware(
      "test",
      (set) => ({
        items: [],
        publish: (items) => set({ items }),
        publishNoop: () => set((state) => state),
      }),
      (state) => state.items.length,
      measurement,
    ),
  );

  return { collector, useStore };
}

describe("performance store middleware", () => {
  it("records publications, no-ops, cardinality and active subscribers", () => {
    const { collector, useStore } = createMeasuredStore();
    const unsubscribe = useStore.subscribe(() => undefined);

    useStore.getState().publish(["a", "b"]);
    useStore.getState().publishNoop();
    unsubscribe();

    const publicationRecords = collector
      .getReport()
      .timeline.filter((entry) => entry.name === "store.test.publication");
    expect(publicationRecords).toEqual([
      expect.objectContaining({
        data: { cardinality: 2, published: true, subscriberCount: 1 },
      }),
      expect.objectContaining({
        data: { cardinality: 2, published: false, subscriberCount: 1 },
      }),
    ]);
    expect(collector.getReport().summaries).toContainEqual(
      expect.objectContaining({
        count: 2,
        name: "store.test.set",
      }),
    );
    expect(collector.getReport().summaries).toContainEqual(
      expect.objectContaining({ count: 1, name: "store.test.updater" }),
    );
    expect(collector.getReport().summaries).toContainEqual(
      expect.objectContaining({
        count: 1,
        name: "store.test.subscriber.anonymous",
      }),
    );
  });

  it("also measures direct setState without double counting", () => {
    const { collector, useStore } = createMeasuredStore();

    useStore.setState({ items: ["external"] });

    expect(
      collector
        .getReport()
        .timeline.filter((entry) => entry.name === "store.test.set"),
    ).toHaveLength(1);
  });
});
