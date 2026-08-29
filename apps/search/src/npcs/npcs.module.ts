import { Module } from "@nestjs/common";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";
import { MeilisearchModule } from "#src/meilisearch/meilisearch.module";
import { NpcsController } from "./npcs.controller.js";
import { NpcsHandlers } from "./npcs.handlers.js";
import { NpcsService } from "./npcs.service.js";

@Module({
  imports: [MeilisearchModule, RabbitMQModule.forRoot(rabbitmqConfig)],
  controllers: [NpcsController],
  providers: [NpcsService, NpcsHandlers],
  exports: [NpcsService],
})
export class NpcsModule {}
