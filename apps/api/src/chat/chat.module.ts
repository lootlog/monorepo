import { Module } from "@nestjs/common";
import { MembersModule } from "src/members/members.module";
import { GuildsModule } from "src/guilds/guilds.module";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "src/config/rabbitmq.config";
import { ChatService } from "src/chat/chat.service";
import { ChatController } from "src/chat/chat.controller";
import { RedisModule } from "src/lib/redis/redis.module";
import { PrismaModule } from "src/db/prisma.module";

@Module({
  imports: [
    MembersModule,
    GuildsModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
    RedisModule,
    PrismaModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
