import { NpcTypeEnum, getNpcTypeByWt } from "@lootlog/types";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import type { Meilisearch, SearchParams } from "meilisearch";
import type { z } from "zod";
import { MEILISEARCH_CLIENT } from "src/meilisearch/meilisearch.constants";
import { buildMeilisearchSearchTermFilter } from "src/meilisearch/meilisearch.utils";
import type { GetNpcsDto } from "./dto/get-npcs.dto";
import { NPCS_INDEX } from "./constants/meilisearch";
import type { IndexNpcsDto } from "./dto/index-npcs.dto";
import type { npcHitSchema } from "./dto/npc-hit.schema";

type NpcHit = z.infer<typeof npcHitSchema>;

@Injectable()
export class NpcsService {
  constructor(
    @Inject(MEILISEARCH_CLIENT) private readonly meilisearch: Meilisearch,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async getNpcs({ ids, limit, search, world }: GetNpcsDto) {
    const index = this.meilisearch.index<NpcHit>(NPCS_INDEX);
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

    try {
      const data = await index.search(searchTerm, query);

      if (ids && ids.length > 0) {
        return data.hits;
      }

      const uniqueHits = data.hits.filter((npc, index) => {
        const npcKey = `${npc.name}_${npc.type}`;

        return (
          data.hits.findIndex(
            (candidate) => `${candidate.name}_${candidate.type}` === npcKey,
          ) === index
        );
      });
      return uniqueHits;
    } catch (error) {
      this.logger.error("NPC search error", { error });
      return [];
    }
  }

  async indexNpcs(data: IndexNpcsDto) {
    const index = this.meilisearch.index(NPCS_INDEX);

    const validNpcs = data.npcs.filter(
      (npc) => npc.world && npc.id && npc.name,
    );

    if (validNpcs.length === 0) {
      this.logger.warn("No valid npcs to index (missing required fields)", {
        npcs: data.npcs,
      });
      return;
    }

    if (validNpcs.length !== data.npcs.length) {
      const invalidNpcs = data.npcs.filter(
        (npc) => !npc.world || !npc.id || !npc.name,
      );
      this.logger.warn(
        `Skipped ${invalidNpcs.length} npcs due to missing required fields`,
        { invalidNpcs },
      );
    }

    const npcsWithUid = validNpcs.map((npc) => ({
      ...npc,
      type: getNpcTypeByWt(NpcTypeEnum, npc.wt, npc.prof, npc.margonemType),
      uid: `${npc.id}_${npc.margonemType}_${npc.world}`,
    }));

    try {
      return await index.addDocuments(npcsWithUid, { primaryKey: "uid" });
    } catch (error) {
      this.logger.error("Error indexing npcs", { error });
    }
  }
}
