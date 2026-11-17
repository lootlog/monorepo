import { Effect, Metric } from "effect";
import { chunk } from "es-toolkit";
import type { Index, RecordAny } from "meilisearch";
import { SEARCH_INDEX_PRIMARY_KEY } from "./index-settings.js";
import {
  attemptMeilisearch,
  completeMeilisearchTask,
} from "./operation-failure.js";

const PROJECTION_BATCH = 500;

/**
 * The incoming documents merged over the stored ones, keeping only those the
 * merge changed. Documents compare as JSON, the way the store returns them,
 * so a redelivered observation writes nothing.
 */
export const changedDocuments = <Document extends { uid: string }>(
  incoming: ReadonlyArray<Document>,
  stored: ReadonlyArray<Document>,
  merge: (incoming: Document, stored: Document | undefined) => Document = (
    document,
  ) => document,
): Document[] => {
  const storedByUid = new Map(
    stored.map((document) => [document.uid, document]),
  );

  return incoming.flatMap((document) => {
    const existing = storedByUid.get(document.uid);

    const merged: Document = JSON.parse(
      JSON.stringify(merge(document, existing)),
    );

    return Bun.deepEquals(existing, merged) ? [] : [merged];
  });
};

/** Replaces documents in an index, one completed task per batch. */
export const projectDocuments = <Document extends RecordAny>(
  index: Index<Document>,
  documents: ReadonlyArray<Document>,
  operation: string,
) =>
  Effect.forEach(
    chunk([...documents], PROJECTION_BATCH),
    (batch) =>
      completeMeilisearchTask(operation, () =>
        index.addDocuments(batch, { primaryKey: SEARCH_INDEX_PRIMARY_KEY }),
      ),
    { discard: true },
  );

/** Indexes the documents that differ from what the index already holds. */
export const indexChangedDocuments = Effect.fn("Search.indexChangedDocuments")(
  function* <Document extends { uid: string }>(
    index: Index<Document>,
    documents: ReadonlyArray<Document>,
  ) {
    const received = Metric.counter("search.index.documents.received", {
      attributes: { index: index.uid },
    });

    const skipped = Metric.counter("search.index.documents.skipped", {
      attributes: { index: index.uid },
    });

    const indexed = Metric.counter("search.index.documents.indexed", {
      attributes: { index: index.uid },
    });

    yield* Metric.update(received, documents.length);

    const uniqueDocuments = [
      ...new Map(
        documents.map((document) => [document.uid, document]),
      ).values(),
    ];

    yield* Metric.update(skipped, documents.length - uniqueDocuments.length);

    // Batches hold disjoint uids, so their reads are independent.
    const changedBatches = yield* Effect.forEach(
      chunk(uniqueDocuments, 100),
      (batch) =>
        attemptMeilisearch(`search.${index.uid}.existing`, () =>
          index.getDocuments({
            ids: batch.map((document) => document.uid),
            limit: batch.length,
          }),
        ).pipe(
          Effect.map((stored) => changedDocuments(batch, stored.results)),
          Effect.tap((changed) =>
            Metric.update(skipped, batch.length - changed.length),
          ),
        ),
      { concurrency: 4 },
    );

    const changed = changedBatches.flat();

    yield* projectDocuments(index, changed, `search.${index.uid}.index`);
    yield* Metric.update(indexed, changed.length);
  },
);
