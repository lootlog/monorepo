import { Effect, Schema } from "effect";
import type { Meilisearch } from "meilisearch";
import {
  attemptMeilisearch,
  completeMeilisearchTask,
} from "#src/meilisearch/search-operation-failure";
import { npcCatalogKey } from "./npcs.service.js";
import { NPCS_INDEX } from "./search-index.js";

const CatalogSource = Schema.Struct({
  uid: Schema.String,
  id: Schema.Number,
  world: Schema.String,
  margonemType: Schema.optional(Schema.NullOr(Schema.Number)),
  type: Schema.optional(
    Schema.NullOr(Schema.Union([Schema.String, Schema.Number])),
  ),
});

const BATCH_SIZE = 500;

const MAX_BATCHES = 20;

/** Resumable metadata migration; never changes accepted NPC attributes. */
export const backfillNpcCatalogKeys = Effect.fn(
  "SearchNpcs.backfillCatalogKeys",
)(function* (client: Meilisearch) {
  const index = client.index(NPCS_INDEX);

  const settings = yield* attemptMeilisearch(
    "search.npcs.backfill.settings",
    () => index.getSettings(),
  );

  const filterable = settings.filterableAttributes ?? [];

  if (!filterable.includes("catalogKey")) {
    yield* completeMeilisearchTask("search.npcs.backfill.configure", () =>
      index.updateFilterableAttributes([...filterable, "catalogKey"]),
    );
  }

  let updated = 0;

  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const page = yield* attemptMeilisearch("search.npcs.backfill.read", () =>
      index.getDocuments({
        filter: "catalogKey NOT EXISTS",
        limit: BATCH_SIZE,
        fields: ["uid", "id", "world", "margonemType", "type"],
      }),
    );

    const documents = yield* Schema.decodeUnknownEffect(
      Schema.Array(CatalogSource),
    )(page.results);

    if (documents.length === 0) return { updated, complete: true };

    yield* completeMeilisearchTask("search.npcs.backfill.write", () =>
      index.updateDocuments(
        documents.map((npc) => ({
          uid: npc.uid,
          catalogKey: npcCatalogKey(npc),
        })),
      ),
    );
    updated += documents.length;
  }

  return { updated, complete: false };
});
