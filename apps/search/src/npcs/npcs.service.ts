import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import { Effect } from "effect";
import type { Meilisearch, SearchParams } from "meilisearch";
import { buildMeilisearchSearchTermFilter } from "#src/meilisearch/query-builder";
import {
  attemptMeilisearch,
  type SearchOperationFailure,
} from "#src/meilisearch/search-operation-failure";
import type { AppLogger } from "#src/shared/logger";
import { getNpcTypeByWt } from "./npc-type.js";
import type { NpcSearchQuery } from "./npc-search-query.js";
import { NPCS_INDEX } from "./search-index.js";
import type { IndexNpcsCommand } from "./index-npcs-command.js";
import type { NpcHit } from "./npc-hit.js";

type RawNpcHit = Omit<NpcHit, "margonemType" | "prof" | "type"> & {
  margonemType?: number | null;
  prof?: string | null;
  type?: NpcHit["type"] | number | string | null;
};

const normalizeNpcHit = (npc: RawNpcHit): NpcHit => {
  const prof = npc.prof ?? "";
  let margonemType = 0;
  if (typeof npc.margonemType === "number") {
    margonemType = npc.margonemType;
  } else if (typeof npc.type === "number") {
    margonemType = npc.type;
  }
  const type =
    typeof npc.type === "string" &&
    Object.values(NpcTypeEnum).includes(npc.type as NpcTypeEnum)
      ? (npc.type as NpcTypeEnum)
      : getNpcTypeByWt(npc.wt, prof, margonemType);

  return { ...npc, prof, margonemType, type };
};

const uniqueNpcsByNameAndType = (npcs: ReadonlyArray<NpcHit>) => {
  const seenNpcKeys = new Set<string>();
  return npcs.filter((npc) => {
    const npcKey = `${npc.name}_${npc.type}`;
    if (seenNpcKeys.has(npcKey)) return false;
    seenNpcKeys.add(npcKey);
    return true;
  });
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
      attributesToSearchOn: ["name"],
      ...(filters.length > 0 && { filter: filters.join(" AND ") }),
    };

    return yield* attemptMeilisearch("search.npcs", () =>
      index.search(searchTerm, query),
    ).pipe(
      Effect.map((response) => {
        const hits = response.hits.map(normalizeNpcHit);
        return ids && ids.length > 0 ? hits : uniqueNpcsByNameAndType(hits);
      }),
      Effect.catch((error) => {
        logger.error("NPC search error", { error });
        return Effect.succeed([] as NpcHit[]);
      }),
    );
  });

  const indexNpcs = Effect.fn("SearchNpcs.index")(function* (
    data: IndexNpcsCommand,
  ) {
    const index = meilisearch.index(NPCS_INDEX);

    const validNpcs = data.npcs.filter(
      (npc) => npc.world && npc.id && npc.name,
    );

    if (validNpcs.length === 0) {
      logger.warn("No valid npcs to index (missing required fields)", {
        npcs: data.npcs,
      });
      return;
    }

    if (validNpcs.length !== data.npcs.length) {
      const invalidNpcs = data.npcs.filter(
        (npc) => !npc.world || !npc.id || !npc.name,
      );
      logger.warn(
        `Skipped ${invalidNpcs.length} npcs due to missing required fields`,
        { invalidNpcs },
      );
    }

    const npcsWithUid = validNpcs.map((npc) => {
      const prof = npc.prof ?? "";

      return {
        ...npc,
        prof,
        type: getNpcTypeByWt(npc.wt, prof, npc.margonemType),
        uid: `${npc.id}_${npc.margonemType}_${npc.world}`,
      };
    });

    yield* attemptMeilisearch("search.npcs.index", () =>
      index.addDocuments(npcsWithUid, { primaryKey: "uid" }),
    );
  });

  return { getNpcs, indexNpcs } satisfies {
    readonly getNpcs: (
      input: NpcSearchQuery,
    ) => Effect.Effect<ReadonlyArray<NpcHit>>;
    readonly indexNpcs: (
      data: IndexNpcsCommand,
    ) => Effect.Effect<void, SearchOperationFailure>;
  };
};
