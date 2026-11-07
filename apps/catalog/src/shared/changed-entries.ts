import { Effect, Metric } from "effect";

const received = Metric.counter("catalog.entries.received");

const changedCount = Metric.counter("catalog.entries.changed");

/**
 * The incoming entries merged over the stored ones, keeping only those the
 * merge changed. Entries compare as JSON, the way the database returns them,
 * so a redelivered observation writes nothing.
 */
export const changedEntries = Effect.fnUntraced(function* <
  Entry extends { uid: string },
>(
  kind: string,
  incoming: ReadonlyArray<Entry>,
  stored: ReadonlyArray<Entry>,
  merge: (entry: Entry, stored: Entry | undefined) => Entry,
) {
  const storedByUid = new Map(stored.map((entry) => [entry.uid, entry]));

  const changed = incoming.flatMap((entry) => {
    const existing = storedByUid.get(entry.uid);
    const merged: Entry = JSON.parse(JSON.stringify(merge(entry, existing)));

    return Bun.deepEquals(existing, merged) ? [] : [merged];
  });

  yield* Metric.update(
    Metric.withAttributes(received, { kind }),
    incoming.length,
  );
  yield* Metric.update(
    Metric.withAttributes(changedCount, { kind }),
    changed.length,
  );

  return changed;
});
