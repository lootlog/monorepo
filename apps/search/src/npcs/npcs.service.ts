import { indexChangedDocuments } from "#src/meilisearch/index-changed-documents";
import { NpcTypeEnum, NpcTypeSchema } from "@lootlog/schema/npc-type";
import { Effect, Predicate, Schema } from "effect";
import { partition, uniqBy } from "es-toolkit";
import type { Meilisearch, SearchParams } from "meilisearch";
import { buildMeilisearchSearchTermFilter } from "#src/meilisearch/query-builder";
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

type RawNpcHit = Omit<NpcHit, "margonemType" | "prof" | "type"> & {
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
    name: npc.name,
    icon: npc.icon,
    lvl: npc.lvl,
    wt: npc.wt,
    world: npc.world,
    prof,
    margonemType,
    type,
  };
};

type IndexNpc = IndexNpcsCommand["npcs"][number];

export const npcCatalogKey = (
  npc: Pick<RawNpcHit, "id" | "margonemType" | "type" | "world">,
) => `${npc.id}_${resolveMargonemType(npc)}_${npc.world}`;

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

    const { filter: searchFilter, searchTerm } =
      buildMeilisearchSearchTermFilter("name", search);

    const filters: string[] = [];

    if (searchFilter) {
      filters.push(searchFilter);
    }

    if (ids && ids.length > 0) {
      filters.push(`id IN [${ids.join(", ")}]`);
    }

    if (world) {
      filters.push(`world = "${world}"`);
    }

    const query: SearchParams = {
      limit,
      distinct: "catalogKey",
      attributesToSearchOn: ["name"],
      ...(filters.length > 0 && { filter: filters.join(" AND ") }),
    };

    return yield* attemptMeilisearch("search.npcs", () =>
      index.search(searchTerm, query),
    ).pipe(
      Effect.map((response) => {
        const hits = uniqBy(response.hits.map(normalizeNpcHit), npcCatalogKey);

        return ids && ids.length > 0
          ? hits
          : uniqBy(hits, (npc) => `${npc.name}_${npc.type}`);
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
