import { Module } from "@nestjs/common";
import { NecordModule } from "necord";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WinstonModule, type WinstonModuleOptions } from "nest-winston";
import { APP_CONFIG } from "./config/app.config";
import { ConfigKey } from "./config/config-key.enum";
import { discordConfigFactory } from "./config/discord.config";
import { BotModule } from "./bot/bot.module";
import { HealthzModule } from "./healthz/healthz.module";

@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        return configService.get<WinstonModuleOptions>(ConfigKey.WINSTON);
      },
      inject: [ConfigService],
    }),
    ConfigModule.forRoot(APP_CONFIG),
    ConfigModule,
    NecordModule.forRootAsync({
      inject: [ConfigService],
      useFactory: discordConfigFactory,
    }),
    BotModule,
    HealthzModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
