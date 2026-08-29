import { Module } from "@nestjs/common";
import { meilisearchClientProvider } from "./meilisearch.provider.js";
import { MeilisearchIndexesService } from "./meilisearch-indexes.service.js";

@Module({
  providers: [meilisearchClientProvider, MeilisearchIndexesService],
  exports: [meilisearchClientProvider],
})
export class MeilisearchModule {}
