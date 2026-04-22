import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { Meilisearch, type SearchParams } from "meilisearch";
import type { z } from "zod";
import { MEILISEARCH_CLIENT } from "src/meilisearch/meilisearch.constants";
import type { GetItemsDto } from "./dto/get-items.dto";
import { ITEMS_INDEX } from "./constants/meilisearch";
import type { IndexItemsDto } from "./dto/index-items.dto";
import type { itemHitSchema } from "./dto/item-hit.schema";
import { createItemSearchFields } from "./utils/create-item-search-fields";

type ItemHit = z.infer<typeof itemHitSchema>;

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
    const filters = [
      ...(Array.isArray(filter) ? filter : filter ? [filter] : []),
      ...(world ? [`world = ${JSON.stringify(world)}`] : []),
    ];

    const query: SearchParams = {
      limit,
      offset,
      attributesToSearchOn: ["name", "stat"],
      ...(facets && facets.length > 0 ? { facets } : {}),
      ...(filters.length > 0 ? { filter: filters.join(" AND ") } : {}),
      ...(sort && sort.length > 0 ? { sort } : {}),
    };

    try {
      const data = await index.search(searchTerm, query);
      return {
        hits: data.hits,
        estimatedTotalHits:
          "estimatedTotalHits" in data
            ? data.estimatedTotalHits
            : (data.totalHits ?? data.hits.length),
        facetDistribution: data.facetDistribution ?? {},
        facetStats: data.facetStats ?? {},
      };
    } catch (error) {
      this.logger.error("Items search error", { error });
      return {
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: {},
        facetStats: {},
      };
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
    const index = this.meilisearch.index(ITEMS_INDEX);

    const validItems = data.items.filter(
      (item) => item.world && item.id && item.name,
    );

    if (validItems.length === 0) {
      this.logger.warn("No valid items to index (missing required fields)");
      return;
    }

    if (validItems.length !== data.items.length) {
      this.logger.warn(
        `Skipped ${data.items.length - validItems.length} items due to missing required fields`,
      );
    }

    const itemsWithUid = validItems.map((item) => ({
      ...item,
      ...createItemSearchFields(item.stat),
      hid: item.hid ?? "",
      uid: `${item.id}_${item.world}`,
    }));

    try {
      return await index.addDocuments(itemsWithUid, { primaryKey: "uid" });
    } catch (error) {
      this.logger.error("Error indexing items", { error });
      return;
    }
  }
}
