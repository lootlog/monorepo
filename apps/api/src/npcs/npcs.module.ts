import { Module } from "@nestjs/common";
import { NpcsService } from "./npcs.service.js";
import { MembersModule } from "#src/members/members.module";
import { GuildsModule } from "#src/guilds/guilds.module";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";
import { PrismaModule } from "#src/db/prisma.module";

@Module({
  imports: [
    MembersModule,
    GuildsModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
    PrismaModule,
  ],
  controllers: [],
  providers: [NpcsService],
  exports: [NpcsService],
})
export class NpcsModule {}
