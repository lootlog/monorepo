import type { Meilisearch, SearchParams } from "meilisearch";
import type { z } from "zod";
import { meilisearchClient } from "../lib/meilisearch.js";
import { logger } from "../config/winston.config.js";
import { validateIndexableItems } from "../lib/utils/validate-indexable-items.js";
import type { GetItemsDto } from "./dto/get-items.dto.js";
import { ITEMS_INDEX } from "./constants/meilisearch.js";
import type { IndexItemsDto } from "./dto/index-items.dto.js";
import type { itemHitSchema } from "./dto/item-hit.schema.js";

type ItemHit = z.infer<typeof itemHitSchema>;

export class ItemsService {
  meilisearch: Meilisearch;

  constructor() {
    this.meilisearch = meilisearchClient;
    const index = this.meilisearch.index(ITEMS_INDEX);
    index.updateFilterableAttributes(["name", "world"]);
    index.updateSearchableAttributes(["name"]);
  }

  async getItems({ limit, search, world }: GetItemsDto) {
    const index = this.meilisearch.index<ItemHit>(ITEMS_INDEX);
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
      logger.error("Items search error", { error });
      return [];
    }
  }

  async indexItems(data: IndexItemsDto) {
    const index = this.meilisearch.index(ITEMS_INDEX);

    const validItems = validateIndexableItems(data.items, "items", logger);
    if (!validItems) return;

    const itemsWithUid = validItems.map((item) => ({
      ...item,
      uid: `${item.id}_${item.world}`,
    }));

    try {
      return index.addDocuments(itemsWithUid, { primaryKey: "uid" });
    } catch (error) {
      logger.error("Error indexing items", { error });
      return;
    }
  }
}
