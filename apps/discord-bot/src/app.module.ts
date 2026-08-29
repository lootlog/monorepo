import { Module } from "@nestjs/common";
import { NecordModule } from "necord";
import { WinstonModule } from "nest-winston";
import { BotModule } from "./bot/bot.module.js";
import { HealthzModule } from "./healthz/healthz.module.js";
import { necordConfig } from "./config/discord.config.js";
import { winstonConfig } from "./config/winston.config.js";

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
