import type { Meilisearch, SearchParams } from "meilisearch";
import { meilisearchClient } from "../lib/meilisearch.js";
import type { GetItemsDto } from "./dto/get-items.dto.js";
import { ITEMS_INDEX } from "./constants/meilisearch.js";
import type { IndexItemsDto } from "./dto/index-items.dto.js";

export class ItemsService {
  meilisearch: Meilisearch;

  constructor() {
    this.meilisearch = meilisearchClient;
    const index = this.meilisearch.index(ITEMS_INDEX);
    index.updateFilterableAttributes(["name", "world"]);
    index.updateSearchableAttributes(["name"]);
  }

  async getItems({ limit, search, world }: GetItemsDto) {
    const index = this.meilisearch.index(ITEMS_INDEX);
    const searchTerm = search || "";

    const query: SearchParams = {
      limit,
      attributesToSearchOn: ["name"],
    };

    if (world) {
      query.filter = `world = "${world}"`;
    }

    try {
      const data = await index.search(searchTerm, query);
      return data.hits;
    } catch (error) {
      console.error("Items search error:", error);
      return [];
    }
  }

  async indexItems(data: IndexItemsDto) {
    const index = this.meilisearch.index(ITEMS_INDEX);

    try {
      return index.addDocuments(data.items, { primaryKey: "id" });
    } catch (error) {
      console.error("Error indexing items:", error);
      return;
    }
  }
}
