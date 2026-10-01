import { indexChangedDocuments } from "#src/meilisearch/index-changed-documents";
import { NpcTypeEnum, NpcTypeSchema } from "@lootlog/schema/npc-type";
import { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import {
  gameVersionOfWorld,
  type GameVersion,
} from "@lootlog/schema/game-version";
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

// Documents written before editions have no `gameVersion` or `worlds`.
type RawNpcHit = Omit<
  NpcHit,
  | "gameVersion"
  | "identityNamespace"
  | "margonemType"
  | "prof"
  | "type"
  | "worlds"
> & {
  gameVersion?: NpcHit["gameVersion"] | null;
  identityNamespace?: NpcIdentityNamespace;
  margonemType?: number | null;
  prof?: string | null;
  type?: NpcHit["type"] | number | string | null;
  worlds?: readonly string[];
};

const uniqueWorlds = (worlds: ReadonlyArray<string>) =>
  [...new Set(worlds.filter(Boolean))].sort((first, second) =>
    first.localeCompare(second),
  );

const npcWorlds = (npc: { world: string; worlds?: readonly string[] }) =>
  uniqueWorlds([...(npc.worlds ?? []), npc.world]);

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
    worlds: npcWorlds(npc),
    gameVersion: npc.gameVersion ?? gameVersionOfWorld(npc.world),
    prof,
    margonemType,
    type,
  };
};

type IndexNpc = IndexNpcsCommand["npcs"][number];

// One catalog entry per edition, identity namespace, id and Margonem type:
// every world of an edition uses the same NPC ids. Legacy keys omit the
// namespace; equal ids in another namespace or edition are a different NPC.
export const npcCatalogKey = (
  npc: Pick<RawNpcHit, "id" | "identityNamespace" | "margonemType" | "type"> & {
    gameVersion: GameVersion;
  },
) => {
  const key = `${npc.id}_${resolveMargonemType(npc)}`;
  const namespace = npc.identityNamespace ?? NpcIdentityNamespace.LEGACY;

  const namespaced =
    namespace === NpcIdentityNamespace.LEGACY ? key : `${namespace}_${key}`;

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
 * share it. `world` is the world of the latest observation and `worlds` every
 * world it was observed in. An observation without an edition takes the
 * edition of its world.
 */
export const toNpcDocument = (npc: IndexNpc) => {
  const prof = npc.prof ?? "";

  const type = Schema.is(NpcTypeSchema)(npc.type)
    ? npc.type
    : getNpcTypeByWt(NpcTypeEnum, npc.wt, prof, npc.margonemType);

  const gameVersion = npc.gameVersion ?? gameVersionOfWorld(npc.world);
  const catalogKey = npcCatalogKey({ ...npc, gameVersion });

  return {
    id: npc.id,
    identityNamespace: npc.identityNamespace ?? NpcIdentityNamespace.LEGACY,
    name: npc.name,
    icon: npc.icon,
    lvl: npc.lvl,
    wt: npc.wt,
    prof,
    type,
    margonemType: npc.margonemType,
    world: npc.world,
    worlds: npcWorlds(npc),
    gameVersion,
    catalogKey,
    uid: catalogKey,
  };
};

type NpcDocument = ReturnType<typeof toNpcDocument>;

/** Documents of one catalog entry in one batch keep the last observation. */
export const mergeNpcDocuments = (
  documents: ReadonlyArray<NpcDocument>,
): NpcDocument[] => {
  const byUid = new Map<string, NpcDocument>();

  for (const document of documents) {
    const existing = byUid.get(document.uid);

    byUid.set(document.uid, {
      ...document,
      worlds: uniqueWorlds([...(existing?.worlds ?? []), ...document.worlds]),
    });
  }

  return [...byUid.values()];
};

export const makeNpcsModule = (meilisearch: Meilisearch, logger: AppLogger) => {
  // `world` is accepted for older callers and ignored: every world of an
  // edition shares its NPCs.
  const getNpcs = Effect.fn("SearchNpcs.get")(function* ({
    ids,
    limit,
    search,
  }: NpcSearchQuery) {
    const index = meilisearch.index<RawNpcHit>(NPCS_INDEX);

    const { searchTerm, query } = buildMeilisearchNameQuery({
      ids,
      limit,
      search,
    });

    // Documents written before editions are one per revision and world;
    // group them by catalog identity before the hit limit applies.
    return yield* attemptMeilisearch("search.npcs", () =>
      index.search(searchTerm, { ...query, distinct: "catalogKey" }),
    ).pipe(
      Effect.map((response) => {
        const hits = uniqBy(response.hits.map(normalizeNpcHit), (hit) =>
          npcCatalogKey(hit),
        );

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
      (npc, stored) => ({
        ...npc,
        worlds: uniqueWorlds([...npc.worlds, ...(stored?.worlds ?? [])]),
      }),
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
