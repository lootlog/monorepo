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
    index.updateFilterableAttributes(["name"]);
  }

  async getNpcs({ limit, search }: GetNpcsDto) {
    const index = this.meilisearch.index(NPCS_INDEX);
    const hasMultipleSearchTerms = Array.isArray(search);
    const searchTerm = hasMultipleSearchTerms ? "" : search;

    const query: SearchParams = {
      limit,
      attributesToSearchOn: ["name"],
    };

    if (hasMultipleSearchTerms) {
      query.filter = `name IN [${search.map((n) => `"${n}"`).join(", ")}]`;
    }

    try {
      const data = await index.search(searchTerm as string, query);

      return data.hits;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  async indexNpcs(data: IndexNpcsDto) {
    const index = this.meilisearch.index(NPCS_INDEX);

    try {
      return index.addDocuments(data.npcs, { primaryKey: "id" });
    } catch (error) {
      console.error("Error indexing npcs:", error);
      return;
    }
  }
}
