import { indexChangedDocuments } from "#src/meilisearch/index-changed-documents";
import { NpcTypeEnum, NpcTypeSchema } from "@lootlog/schema/npc-type";
import { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import { Effect, Predicate, Schema } from "effect";
import { partition, uniqBy } from "es-toolkit";
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

type RawNpcHit = Omit<
  NpcHit,
  "gameVersion" | "identityNamespace" | "margonemType" | "prof" | "type"
> & {
  gameVersion?: NpcHit["gameVersion"];
  identityNamespace?: NpcIdentityNamespace;
  margonemType?: number | null;
  prof?: string | null;
  type?: NpcHit["type"] | number | string | null;
};

const resolveMargonemType = (npc: Pick<RawNpcHit, "margonemType" | "type">) => {
  let margonemType = 0;

  if (Predicate.isNumber(npc.margonemType)) {
    margonemType = npc.margonemType;
  } else if (Predicate.isNumber(npc.type)) {
    margonemType = npc.type;
  }

  return margonemType;
};

const normalizeNpcHit = (npc: RawNpcHit): NpcHit => {
  const prof = npc.prof ?? "";
  const margonemType = resolveMargonemType(npc);

  const type = Schema.is(NpcTypeSchema)(npc.type)
    ? npc.type
    : getNpcTypeByWt(NpcTypeEnum, npc.wt, prof, margonemType);

  return {
    id: npc.id,
    identityNamespace: npc.identityNamespace ?? NpcIdentityNamespace.LEGACY,
    name: npc.name,
    icon: npc.icon,
    lvl: npc.lvl,
    wt: npc.wt,
    world: npc.world,
    gameVersion: npc.gameVersion ?? null,
    prof,
    margonemType,
    type,
  };
};

type IndexNpc = IndexNpcsCommand["npcs"][number];

// Legacy keys keep their deployed format; equal ids in another namespace or
// game version are a different NPC and must not share a catalog group.
export const npcCatalogKey = (
  npc: Pick<
    RawNpcHit,
    | "gameVersion"
    | "id"
    | "identityNamespace"
    | "margonemType"
    | "type"
    | "world"
  >,
) => {
  const key = `${npc.id}_${resolveMargonemType(npc)}_${npc.world}`;
  const namespace = npc.identityNamespace ?? NpcIdentityNamespace.LEGACY;

  const namespaced =
    namespace === NpcIdentityNamespace.LEGACY ? key : `${namespace}_${key}`;

  return npc.gameVersion ? `${npc.gameVersion}_${namespaced}` : namespaced;
};

// A template id selects every spawn of the monster; prefer it when name and
// type collapse several catalog identities into one suggestion.
const NAMESPACE_PREFERENCE: Record<NpcIdentityNamespace, number> = {
  [NpcIdentityNamespace.TEMPLATE]: 0,
  [NpcIdentityNamespace.LEGACY]: 1,
  [NpcIdentityNamespace.RUNTIME]: 2,
};

const collapseByNameAndType = (hits: readonly NpcHit[]) => {
  const suggestionKey = (npc: NpcHit) => `${npc.name}_${npc.type}`;
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

  // Keep the relevance position of each name/type's first hit.
  return uniqBy(hits, suggestionKey).flatMap(
    (hit) => preferred.get(suggestionKey(hit)) ?? [],
  );
};

/** The stored shape of one NPC; the seed script and the consumer share it. */
export const toNpcDocument = (npc: IndexNpc) => {
  const prof = npc.prof ?? "";

  const type = Schema.is(NpcTypeSchema)(npc.type)
    ? npc.type
    : getNpcTypeByWt(NpcTypeEnum, npc.wt, prof, npc.margonemType);

  return {
    ...npc,
    prof,
    type,
    catalogKey: npcCatalogKey(npc),
    uid: npc.snapshotHash
      ? `${npcCatalogKey(npc)}_${npc.snapshotHash}`
      : npcCatalogKey(npc),
  };
};

export const makeNpcsModule = (meilisearch: Meilisearch, logger: AppLogger) => {
  const getNpcs = Effect.fn("SearchNpcs.get")(function* ({
    ids,
    limit,
    search,
    world,
  }: NpcSearchQuery) {
    const index = meilisearch.index<RawNpcHit>(NPCS_INDEX);

    const { searchTerm, query } = buildMeilisearchNameQuery({
      ids,
      limit,
      search,
      world,
    });

    // Group revisions of one catalog identity before the hit limit applies.
    return yield* attemptMeilisearch("search.npcs", () =>
      index.search(searchTerm, { ...query, distinct: "catalogKey" }),
    ).pipe(
      Effect.map((response) => {
        const hits = uniqBy(response.hits.map(normalizeNpcHit), npcCatalogKey);

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

    const npcsWithUid = validNpcs.map(toNpcDocument);

    yield* indexChangedDocuments(
      meilisearch.index<(typeof npcsWithUid)[number]>(NPCS_INDEX),
      npcsWithUid,
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
