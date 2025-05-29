import { Module } from '@nestjs/common';
import { NecordModule } from 'necord';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_CONFIG } from './config/app.config';
import { discordConfigFactory } from './config/discord.config';
import { BotModule } from './bot/bot.module';
import { HealthzModule } from './healthz/healthz.module';

@Module({
  imports: [
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
