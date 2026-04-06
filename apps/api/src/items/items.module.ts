import { Module } from "@nestjs/common";
import { ItemsService } from "./items.service";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "src/config/rabbitmq.config";

@Module({
  imports: [RabbitMQModule.forRoot(rabbitmqConfig)],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
