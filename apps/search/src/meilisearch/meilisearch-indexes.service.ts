import type { Meilisearch } from "meilisearch";
import { ITEMS_INDEX } from "#src/items/constants/meilisearch";
import { NPCS_INDEX } from "#src/npcs/constants/meilisearch";
import { PLAYERS_INDEX } from "#src/players/constants/meilisearch";
import type { AppLogger } from "#src/shared/logger";
import { getMeilisearchErrorCode } from "./meilisearch.utils.js";

const itemFilterableAttributes = [
  "world",
  "worlds",
  "type",
  "rarity",
  "lvl",
  "stats",
  "numericStats",
  "requiredProfessions",
  "statsKeys",
];

const indexPrimaryKeys = {
  [NPCS_INDEX]: "uid",
  [PLAYERS_INDEX]: "uid",
  [ITEMS_INDEX]: "uid",
} as const;

export class MeilisearchIndexesService {
  constructor(
    private readonly meilisearch: Meilisearch,
    private readonly logger: AppLogger,
  ) {}

  async onApplicationBootstrap() {
    try {
      await Promise.all(
        Object.entries(indexPrimaryKeys).map(([indexName, primaryKey]) =>
          this.ensureIndex(indexName, primaryKey),
        ),
      );

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
        this.meilisearch
          .index(ITEMS_INDEX)
          .updateDistinctAttribute("id")
          .waitTask(),
      ]);
    } catch (error) {
      this.logger.error("Failed to configure Meilisearch indexes", { error });
    }
  }

  private async ensureIndex(indexName: string, primaryKey: string) {
    try {
      await this.meilisearch.getIndex(indexName);
    } catch (error) {
      if (getMeilisearchErrorCode(error) !== "index_not_found") {
        throw error;
      }

      await this.meilisearch.createIndex(indexName, { primaryKey }).waitTask();
    }
  }
}
