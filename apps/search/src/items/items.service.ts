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

type ItemHit = z.infer<typeof itemHitSchema>;

@Injectable()
export class ItemsService {
  constructor(
    @Inject(MEILISEARCH_CLIENT) private readonly meilisearch: Meilisearch,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async getItems({ limit, search, world }: GetItemsDto) {
    const index = this.meilisearch.index<ItemHit>(ITEMS_INDEX);
    const searchTerm = search ?? "";

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
      this.logger.error("Items search error", { error });
      return [];
    }
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
      hid: item.hid ?? "",
      uid: `${item.id}_${item.world}`,
    }));

    try {
      return index.addDocuments(itemsWithUid, { primaryKey: "uid" });
    } catch (error) {
      this.logger.error("Error indexing items", { error });
      return;
    }
  }
}
