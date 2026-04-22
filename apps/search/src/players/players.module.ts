import { Module } from "@nestjs/common";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "src/config/rabbitmq.config";
import { MeilisearchModule } from "src/meilisearch/meilisearch.module";
import { PlayersController } from "./players.controller";
import { PlayersHandlers } from "./players.handlers";
import { PlayersService } from "./players.service";

@Module({
  imports: [MeilisearchModule, RabbitMQModule.forRoot(rabbitmqConfig)],
  controllers: [PlayersController],
  providers: [PlayersService, PlayersHandlers],
  exports: [PlayersService],
})
export class PlayersModule {}
