import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import type { Meilisearch, SearchParams } from "meilisearch";
import type { z } from "zod";
import { MEILISEARCH_CLIENT } from "#src/meilisearch/meilisearch.constants";
import { getMeilisearchErrorCode } from "#src/meilisearch/meilisearch.utils";
import type { GetItemsDto } from "./dto/get-items.dto.js";
import { ITEMS_INDEX } from "./constants/meilisearch.js";
import type { IndexItemsDto } from "./dto/index-items.dto.js";
import type { itemHitSchema } from "./dto/item-hit.schema.js";
import { createItemSearchFields } from "./utils/create-item-search-fields.js";

type ItemHit = z.infer<typeof itemHitSchema>;
type SearchItemsResponse = {
  estimatedTotalHits: number;
  facetDistribution: Record<string, Record<string, number>>;
  facetStats: Record<string, { max: number; min: number }>;
  hits: ItemHit[];
};

type IndexItem = IndexItemsDto["items"][number];
type IndexedItem = IndexItem & {
  uid: string;
  worlds: string[];
};

const itemAttributesToRetrieve = [
  "id",
  "name",
  "icon",
  "stat",
  "lvl",
  "rarity",
  "type",
  "world",
  "worlds",
];

const buildItemWorldFilter = (world: string) => {
  const formattedWorld = JSON.stringify(world);

  return `(worlds = ${formattedWorld} OR world = ${formattedWorld})`;
};

@Injectable()
export class ItemsService {
  constructor(
    @Inject(MEILISEARCH_CLIENT) private readonly meilisearch: Meilisearch,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async searchItems({
    facets,
    filter,
    limit,
    offset,
    search,
    sort,
    world,
  }: GetItemsDto) {
    const index = this.meilisearch.index<ItemHit>(ITEMS_INDEX);
    const searchTerm = search ?? "";
    let incomingFilters: string[] = [];

    if (Array.isArray(filter)) {
      incomingFilters = filter;
    } else if (filter) {
      incomingFilters = [filter];
    }

    const filters = [
      ...incomingFilters,
      ...(world ? [buildItemWorldFilter(world)] : []),
    ];

    const query: SearchParams = {
      limit,
      offset,
      attributesToSearchOn: ["name", "stat"],
      attributesToRetrieve: itemAttributesToRetrieve,
      ...(facets && facets.length > 0 ? { facets } : {}),
      ...(filters.length > 0 ? { filter: filters.join(" AND ") } : {}),
      ...(sort && sort.length > 0 ? { sort } : {}),
    };

    try {
      const data = await index.search(searchTerm, query);
      return this.mapSearchResponse(data);
    } catch (error) {
      if (
        getMeilisearchErrorCode(error) ===
        "invalid_search_attributes_to_search_on"
      ) {
        this.logger.warn(
          "Items index settings are stale, retrying search without stat attribute",
          { error },
        );

        try {
          const fallbackData = await index.search(searchTerm, {
            ...query,
            attributesToSearchOn: ["name"],
          });

          return this.mapSearchResponse(fallbackData);
        } catch (fallbackError) {
          this.logger.error("Items search error", { error: fallbackError });
          return this.getEmptySearchResponse();
        }
      }

      this.logger.error("Items search error", { error });
      return this.getEmptySearchResponse();
    }
  }

  async getItems({
    limit,
    search,
    world,
  }: Pick<GetItemsDto, "limit" | "search" | "world">) {
    const response = await this.searchItems({
      limit,
      offset: 0,
      search,
      world,
    });

    return response.hits;
  }

  async indexItems(data: IndexItemsDto) {
    const index = this.meilisearch.index<IndexedItem>(ITEMS_INDEX);

    const validItems = data.items.filter((item) => {
      const worlds = this.getItemWorlds(item);
      return item.id && item.name && worlds.length > 0;
    });

    if (validItems.length === 0) {
      this.logger.warn("No valid items to index (missing required fields)");
      return;
    }

    if (validItems.length !== data.items.length) {
      this.logger.warn(
        `Skipped ${data.items.length - validItems.length} items due to missing required fields`,
      );
    }

    const itemsById = this.mergeItemsById(validItems);
    const itemsWithExistingWorlds = await Promise.all(
      itemsById.map(async (item) => {
        const existingWorlds = await this.getExistingWorlds(item.uid);
        return {
          ...item,
          worlds: this.getUniqueWorlds([...item.worlds, ...existingWorlds]),
        };
      }),
    );
    const itemsWithSearchFields = itemsWithExistingWorlds.map(
      ({ world: _world, ...item }) => ({
        ...item,
        ...createItemSearchFields(item.stat),
      }),
    );

    try {
      return await index.addDocuments(itemsWithSearchFields, {
        primaryKey: "uid",
      });
    } catch (error) {
      this.logger.error("Error indexing items", { error });
    }
  }

  private getEmptySearchResponse(): SearchItemsResponse {
    return {
      hits: [],
      estimatedTotalHits: 0,
      facetDistribution: {},
      facetStats: {},
    };
  }

  private mapSearchResponse(data: {
    estimatedTotalHits?: number;
    facetDistribution?: Record<string, Record<string, number>>;
    facetStats?: Record<string, { max: number; min: number }>;
    hits: ItemHit[];
    totalHits?: number;
  }): SearchItemsResponse {
    return {
      hits: data.hits,
      estimatedTotalHits:
        data.estimatedTotalHits ?? data.totalHits ?? data.hits.length,
      facetDistribution: data.facetDistribution ?? {},
      facetStats: data.facetStats ?? {},
    };
  }

  private mergeItemsById(items: IndexItem[]): IndexedItem[] {
    const itemsById = new Map<number, IndexedItem>();

    for (const item of items) {
      const worlds = this.getItemWorlds(item);
      const existingItem = itemsById.get(item.id);

      if (!existingItem) {
        itemsById.set(item.id, {
          ...item,
          uid: String(item.id),
          worlds,
        });
        continue;
      }

      itemsById.set(item.id, {
        ...existingItem,
        ...item,
        uid: String(item.id),
        worlds: this.getUniqueWorlds([...existingItem.worlds, ...worlds]),
      });
    }

    return [...itemsById.values()];
  }

  private getItemWorlds(item: IndexItem) {
    return this.getUniqueWorlds([
      ...(item.worlds ?? []),
      ...(item.world ? [item.world] : []),
    ]);
  }

  private getUniqueWorlds(worlds: string[]) {
    return [...new Set(worlds.filter(Boolean))].sort((first, second) =>
      first.localeCompare(second),
    );
  }

  private async getExistingWorlds(uid: string) {
    const index = this.meilisearch.index<IndexedItem>(ITEMS_INDEX);

    try {
      const document = await index.getDocument(uid);
      return document.worlds ?? [];
    } catch (error) {
      if (getMeilisearchErrorCode(error) !== "document_not_found") {
        this.logger.warn("Could not read existing item worlds", {
          error,
          uid,
        });
      }

      return [];
    }
  }
}
