import { Module } from "@nestjs/common";
import { meilisearchClientProvider } from "./meilisearch.provider";
import { MeilisearchIndexesService } from "./meilisearch-indexes.service";

@Module({
  providers: [meilisearchClientProvider, MeilisearchIndexesService],
  exports: [meilisearchClientProvider],
})
export class MeilisearchModule {}
