import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { Meilisearch } from "meilisearch";
import { ITEMS_INDEX } from "src/items/constants/meilisearch";
import { NPCS_INDEX } from "src/npcs/constants/meilisearch";
import { PLAYERS_INDEX } from "src/players/constants/meilisearch";
import { MEILISEARCH_CLIENT } from "./meilisearch.constants";

const itemFilterableAttributes = [
  "world",
  "type",
  "rarity",
  "lvl",
  "stats",
  "numericStats",
  "requiredProfessions",
  "statsKeys",
];

@Injectable()
export class MeilisearchIndexesService implements OnApplicationBootstrap {
  constructor(
    @Inject(MEILISEARCH_CLIENT) private readonly meilisearch: Meilisearch,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async onApplicationBootstrap() {
    try {
      await Promise.all([
        this.meilisearch
          .index(NPCS_INDEX)
          .updateFilterableAttributes(["name", "type", "world"])
          .waitTask(),
        this.meilisearch
          .index(PLAYERS_INDEX)
          .updateFilterableAttributes(["name", "world"])
          .waitTask(),
        this.meilisearch
          .index(ITEMS_INDEX)
          .updateFilterableAttributes(itemFilterableAttributes)
          .waitTask(),
        this.meilisearch
          .index(ITEMS_INDEX)
          .updateSearchableAttributes(["name", "stat"])
          .waitTask(),
        this.meilisearch
          .index(ITEMS_INDEX)
          .updateSortableAttributes(["name", "lvl", "rarity", "type"])
          .waitTask(),
      ]);
    } catch (error) {
      this.logger.error("Failed to configure Meilisearch indexes", { error });
    }
  }
}
