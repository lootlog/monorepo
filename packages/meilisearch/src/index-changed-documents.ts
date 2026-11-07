import { Effect, Metric } from "effect";
import { chunk } from "es-toolkit";
import type { Index } from "meilisearch";
import { SEARCH_INDEX_PRIMARY_KEY } from "./index-settings.js";
import {
  attemptMeilisearch,
  completeMeilisearchTask,
} from "./operation-failure.js";

export const indexChangedDocuments = Effect.fn("Search.indexChangedDocuments")(
  function* <Document extends { uid: string }>(
    index: Index<Document>,
    documents: ReadonlyArray<Document>,
    merge: (incoming: Document, stored: Document | undefined) => Document = (
      incoming,
    ) => incoming,
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
          Effect.flatMap((stored) => {
            const storedById = new Map(
              stored.results.map((document) => [document.uid, document]),
            );

            const changed = batch.flatMap((incoming) => {
              const existing = storedById.get(incoming.uid);
              const document = merge(incoming, existing);

              return Bun.deepEquals(
                existing,
                JSON.parse(JSON.stringify(document)),
              )
                ? []
                : [document];
            });

            return Metric.update(skipped, batch.length - changed.length).pipe(
              Effect.as(changed),
            );
          }),
        ),
      { concurrency: 4 },
    );

    const changedDocuments = changedBatches.flat();

    for (const batch of chunk(changedDocuments, 500)) {
      yield* completeMeilisearchTask(`search.${index.uid}.index`, () =>
        index.addDocuments(batch, { primaryKey: SEARCH_INDEX_PRIMARY_KEY }),
      );
      yield* Metric.update(indexed, batch.length);
    }
  },
);
