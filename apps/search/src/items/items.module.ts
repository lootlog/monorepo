import { Module } from "@nestjs/common";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";
import { MeilisearchModule } from "#src/meilisearch/meilisearch.module";
import { ItemsController } from "./items.controller.js";
import { ItemsHandlers } from "./items.handlers.js";
import { ItemsService } from "./items.service.js";

@Module({
  imports: [MeilisearchModule, RabbitMQModule.forRoot(rabbitmqConfig)],
  controllers: [ItemsController],
  providers: [ItemsService, ItemsHandlers],
  exports: [ItemsService],
})
export class ItemsModule {}
