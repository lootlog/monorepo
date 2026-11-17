import { Effect, Metric } from "effect";

const received = Metric.counter("catalog.entries.received");

const changedCount = Metric.counter("catalog.entries.changed");

/**
 * Counts one delivery's entries and how many of them it changed. A catalog
 * change can run twice, so its delivery is counted once it is written.
 */
export const countEntries = Effect.fnUntraced(function* (
  kind: string,
  entries: number,
  changed: number,
) {
  yield* Metric.update(Metric.withAttributes(received, { kind }), entries);
  yield* Metric.update(Metric.withAttributes(changedCount, { kind }), changed);
});
