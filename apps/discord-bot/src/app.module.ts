import { Module } from "@nestjs/common";
import { NecordModule } from "necord";
import { WinstonModule } from "nest-winston";
import { BotModule } from "./bot/bot.module";
import { HealthzModule } from "./healthz/healthz.module";
import { necordConfig } from "./config/discord.config";
import { winstonConfig } from "./config/winston.config";

@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
    NecordModule.forRoot(necordConfig),
    BotModule,
    HealthzModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
