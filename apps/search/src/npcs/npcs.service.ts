import type { Meilisearch, SearchParams } from "meilisearch";
import { meilisearchClient } from "../lib/meilisearch.js";
import type { GetNpcsDto } from "./dto/get-npcs.dto.js";
import { NPCS_INDEX } from "./constants/meilisearch.js";
import type { IndexNpcsDto } from "./dto/index-npcs.dto.js";

export class NpcsService {
  meilisearch: Meilisearch;

  constructor() {
    this.meilisearch = meilisearchClient;
    const index = this.meilisearch.index(NPCS_INDEX);
    index.updateFilterableAttributes(["name", "world"]);
  }

  async getNpcs({ limit, search, world }: GetNpcsDto) {
    const index = this.meilisearch.index(NPCS_INDEX);
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
      const data = await index.search(searchTerm as string, query);

      const uniqueHits = Array.from(
        new Map(data.hits.map((npc: any) => [npc.name, npc])).values(),
      );
      return uniqueHits;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  async indexNpcs(data: IndexNpcsDto) {
    const index = this.meilisearch.index(NPCS_INDEX);

    const validNpcs = data.npcs.filter(
      (npc) => npc.world && npc.id && npc.name,
    );

    if (validNpcs.length === 0) {
      console.warn(
        "No valid npcs to index (missing required fields):",
        JSON.stringify(data.npcs, null, 2),
      );
      return;
    }

    if (validNpcs.length !== data.npcs.length) {
      const invalidNpcs = data.npcs.filter(
        (npc) => !npc.world || !npc.id || !npc.name,
      );
      console.warn(
        `Skipped ${invalidNpcs.length} npcs due to missing required fields:`,
        JSON.stringify(invalidNpcs, null, 2),
      );
    }

    const npcsWithUid = validNpcs.map((npc) => ({
      ...npc,
      uid: `${npc.id}_${npc.world}`,
    }));

    try {
      return index.addDocuments(npcsWithUid, { primaryKey: "uid" });
    } catch (error) {
      console.error("Error indexing npcs:", error);
      return;
    }
  }
}
