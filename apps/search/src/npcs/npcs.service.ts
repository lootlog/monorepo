import { indexChangedDocuments } from "#src/meilisearch/index-changed-documents";
import { NpcTypeEnum, NpcTypeSchema } from "@lootlog/schema/npc-type";
import { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import type { GameVersion } from "@lootlog/schema/game-version";
import { Effect, Schema } from "effect";
import { partition, pick, uniqBy } from "es-toolkit";
import type { Meilisearch } from "meilisearch";
import { buildMeilisearchNameQuery } from "#src/meilisearch/query-builder";
import {
  attemptMeilisearch,
  type SearchOperationFailure,
} from "#src/meilisearch/search-operation-failure";
import type { AppLogger } from "#src/shared/logger";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
import type { NpcSearchQuery } from "./npc-search-query.js";
import { NPCS_INDEX } from "./search-index.js";
import type { IndexNpcsCommand } from "./index-npcs-command.js";
import type { NpcHit } from "./npc-hit.js";

const uniqueWorlds = (worlds: ReadonlyArray<string>) =>
  [...new Set(worlds.filter(Boolean))].sort((first, second) =>
    first.localeCompare(second),
  );

type IndexNpc = IndexNpcsCommand["npcs"][number];

// One catalog entry per edition, identity namespace, id and Margonem type:
// every world of an edition uses the same NPC ids. Legacy keys omit the
// namespace; equal ids in another namespace or edition are a different NPC.
export const npcCatalogKey = (npc: {
  id: number;
  identityNamespace: NpcIdentityNamespace;
  margonemType: number;
  gameVersion: GameVersion;
}) => {
  const key = `${npc.id}_${npc.margonemType}`;

  const namespaced =
    npc.identityNamespace === NpcIdentityNamespace.LEGACY
      ? key
      : `${npc.identityNamespace}_${key}`;

  return `${npc.gameVersion}_${namespaced}`;
};

// A template id selects every spawn of the monster; prefer it when name and
// type collapse several catalog identities into one suggestion.
const NAMESPACE_PREFERENCE: Record<NpcIdentityNamespace, number> = {
  [NpcIdentityNamespace.TEMPLATE]: 0,
  [NpcIdentityNamespace.LEGACY]: 1,
  [NpcIdentityNamespace.RUNTIME]: 2,
};

const collapseByNameAndType = (hits: readonly NpcHit[]) => {
  // Equal names in different editions are different NPCs.
  const suggestionKey = (npc: NpcHit) =>
    `${npc.gameVersion}_${npc.name}_${npc.type}`;

  const preferred = new Map<string, NpcHit>();

  for (const hit of hits) {
    const current = preferred.get(suggestionKey(hit));

    if (
      !current ||
      NAMESPACE_PREFERENCE[hit.identityNamespace] <
        NAMESPACE_PREFERENCE[current.identityNamespace]
    ) {
      preferred.set(suggestionKey(hit), hit);
    }
  }

  // Keep the relevance position of each suggestion's first hit.
  return uniqBy(hits, suggestionKey).flatMap(
    (hit) => preferred.get(suggestionKey(hit)) ?? [],
  );
};

/**
 * The stored shape of one NPC catalog entry; the seed script and the consumer
 * share it. `worlds` holds every world the entry was observed in, and
 * `observedLootId` orders observations.
 */
export const toNpcDocument = (npc: IndexNpc) => {
  const prof = npc.prof ?? "";

  const identityNamespace =
    npc.identityNamespace ?? NpcIdentityNamespace.LEGACY;

  const type = Schema.is(NpcTypeSchema)(npc.type)
    ? npc.type
    : getNpcTypeByWt(NpcTypeEnum, npc.wt, prof, npc.margonemType);

  return {
    id: npc.id,
    identityNamespace,
    name: npc.name,
    icon: npc.icon,
    lvl: npc.lvl,
    wt: npc.wt,
    prof,
    type,
    margonemType: npc.margonemType,
    worlds: [npc.world],
    gameVersion: npc.gameVersion,
    uid: npcCatalogKey({ ...npc, identityNamespace }),
    observedLootId: npc.lootId ?? null,
  };
};

type NpcDocument = ReturnType<typeof toNpcDocument>;

const toNpcHit = (document: NpcDocument): NpcHit =>
  pick(document, [
    "id",
    "identityNamespace",
    "name",
    "icon",
    "lvl",
    "wt",
    "prof",
    "type",
    "margonemType",
    "worlds",
    "gameVersion",
  ]);

/**
 * One catalog entry from two observations: the later loot's attributes, and
 * every world of both. Delivery order is not chronology: a retried or
 * redelivered publication can arrive after a newer one. An observation
 * without a loot id, from an older publisher, counts as the latest.
 */
export const mergeNpcDocument = (
  incoming: NpcDocument,
  stored: NpcDocument,
): NpcDocument => {
  const storedIsNewer =
    incoming.observedLootId !== null &&
    stored.observedLootId !== null &&
    stored.observedLootId > incoming.observedLootId;

  return {
    ...(storedIsNewer ? stored : incoming),
    worlds: uniqueWorlds([...incoming.worlds, ...stored.worlds]),
  };
};

/** Documents of one catalog entry in one batch merge into one. */
export const mergeNpcDocuments = (
  documents: ReadonlyArray<NpcDocument>,
): NpcDocument[] => {
  const byUid = new Map<string, NpcDocument>();

  for (const document of documents) {
    const existing = byUid.get(document.uid);

    byUid.set(
      document.uid,
      existing ? mergeNpcDocument(document, existing) : document,
    );
  }

  return [...byUid.values()];
};

export const makeNpcsModule = (meilisearch: Meilisearch, logger: AppLogger) => {
  const getNpcs = Effect.fn("SearchNpcs.get")(function* ({
    ids,
    limit,
    search,
  }: NpcSearchQuery) {
    const index = meilisearch.index<NpcDocument>(NPCS_INDEX);

    const { searchTerm, query } = buildMeilisearchNameQuery({
      ids,
      limit,
      search,
    });

    return yield* attemptMeilisearch("search.npcs", () =>
      index.search(searchTerm, query),
    ).pipe(
      Effect.map((response) => {
        const hits = response.hits.map(toNpcHit);

        return ids && ids.length > 0 ? hits : collapseByNameAndType(hits);
      }),
      Effect.tapError((error) =>
        Effect.sync(() => logger.error("NPC search error", { error })),
      ),
    );
  });

  const indexNpcs = Effect.fn("SearchNpcs.index")(function* (
    data: IndexNpcsCommand,
  ) {
    const [validNpcs, invalidNpcs] = partition(data.npcs, (npc) =>
      Boolean(npc.world && npc.id && npc.name),
    );

    if (validNpcs.length === 0) {
      logger.warn("No valid npcs to index (missing required fields)", {
        npcs: data.npcs,
      });

      return;
    }

    if (validNpcs.length !== data.npcs.length) {
      logger.warn(
        `Skipped ${invalidNpcs.length} npcs due to missing required fields`,
        { invalidNpcs },
      );
    }

    yield* indexChangedDocuments(
      meilisearch.index<NpcDocument>(NPCS_INDEX),
      mergeNpcDocuments(validNpcs.map(toNpcDocument)),
      (npc, stored) => (stored ? mergeNpcDocument(npc, stored) : npc),
    );
  });

  return { getNpcs, indexNpcs } satisfies {
    readonly getNpcs: (
      input: NpcSearchQuery,
    ) => Effect.Effect<ReadonlyArray<NpcHit>, SearchOperationFailure>;
    readonly indexNpcs: (
      data: IndexNpcsCommand,
    ) => Effect.Effect<void, SearchOperationFailure>;
  };
};
