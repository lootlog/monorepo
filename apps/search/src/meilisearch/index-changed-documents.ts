import { Effect, Metric } from "effect";
import { chunk } from "es-toolkit";
import type { Index } from "meilisearch";
import {
  attemptMeilisearch,
  completeMeilisearchTask,
} from "./search-operation-failure.js";

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

    const changedDocuments: Document[] = [];

    for (const batch of chunk(uniqueDocuments, 100)) {
      const stored = yield* attemptMeilisearch(
        `search.${index.uid}.existing`,
        () =>
          index.getDocuments({
            ids: batch.map((document) => document.uid),
            limit: batch.length,
          }),
      );

      const storedById = new Map(
        stored.results.map((document) => [document.uid, document]),
      );

      const changed = batch.flatMap((incoming) => {
        const existing = storedById.get(incoming.uid);
        const document = merge(incoming, existing);

        return Bun.deepEquals(existing, JSON.parse(JSON.stringify(document)))
          ? []
          : [document];
      });

      yield* Metric.update(skipped, batch.length - changed.length);

      changedDocuments.push(...changed);
    }

    for (const batch of chunk(changedDocuments, 500)) {
      yield* completeMeilisearchTask(`search.${index.uid}.index`, () =>
        index.addDocuments(batch, { primaryKey: "uid" }),
      );
      yield* Metric.update(indexed, batch.length);
    }
  },
);
