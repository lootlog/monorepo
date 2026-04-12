import type { Meilisearch, SearchParams } from "meilisearch";
import type { z } from "zod";
import { meilisearchClient } from "../lib/meilisearch.js";
import { logger } from "../config/winston.config.js";
import type { GetNpcsDto } from "./dto/get-npcs.dto.js";
import { NPCS_INDEX } from "./constants/meilisearch.js";
import type { IndexNpcsDto } from "./dto/index-npcs.dto.js";
import type { npcHitSchema } from "./dto/npc-hit.schema.js";

type NpcHit = z.infer<typeof npcHitSchema>;

export class NpcsService {
  meilisearch: Meilisearch;

  constructor() {
    this.meilisearch = meilisearchClient;
    const index = this.meilisearch.index(NPCS_INDEX);
    index.updateFilterableAttributes(["name", "type", "world"]);
  }

  async getNpcs({ limit, search, world }: GetNpcsDto) {
    const index = this.meilisearch.index<NpcHit>(NPCS_INDEX);
    const hasMultipleSearchTerms = Array.isArray(search);
    const searchTerm = hasMultipleSearchTerms ? "" : search;

    const filters: string[] = [];

    if (hasMultipleSearchTerms) {
      filters.push(`name IN [${search.map((n) => `"${n}"`).join(", ")}]`);
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

      const uniqueHits = Array.from(
        new Map(
          data.hits.map((npc) => [`${npc.name}_${npc.type}`, npc]),
        ).values(),
      );
      return uniqueHits;
    } catch (error) {
      logger.error("NPC search error", { error });
      return [];
    }
  }

  async indexNpcs(data: IndexNpcsDto) {
    const index = this.meilisearch.index(NPCS_INDEX);

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
      const skippedCount = data.npcs.length - validNpcs.length;
      logger.warn(
        `Skipped ${skippedCount} npcs due to missing required fields`,
      );
    }

    const npcsWithUid = validNpcs.map((npc) => ({
      ...npc,
      uid: `${npc.id}_${npc.type}_${npc.world}`,
    }));

    try {
      return index.addDocuments(npcsWithUid, { primaryKey: "uid" });
    } catch (error) {
      logger.error("Error indexing npcs", { error });
    }
  }
}
