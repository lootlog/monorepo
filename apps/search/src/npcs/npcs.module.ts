import { Module } from "@nestjs/common";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "src/config/rabbitmq.config";
import { MeilisearchModule } from "src/meilisearch/meilisearch.module";
import { NpcsController } from "./npcs.controller";
import { NpcsHandlers } from "./npcs.handlers";
import { NpcsService } from "./npcs.service";

@Module({
  imports: [MeilisearchModule, RabbitMQModule.forRoot(rabbitmqConfig)],
  controllers: [NpcsController],
  providers: [NpcsService, NpcsHandlers],
  exports: [NpcsService],
})
export class NpcsModule {}
