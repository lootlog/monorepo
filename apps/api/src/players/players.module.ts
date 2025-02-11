import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { MembersModule } from 'src/members/members.module';
import { DiscordModule } from 'src/discord/discord.module';
import { GuildsModule } from 'src/guilds/guilds.module';
import { PrismaService } from 'src/db/prisma.service';
import MeiliSearch, { Config } from 'meilisearch';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';

@Module({
  imports: [MembersModule, DiscordModule, GuildsModule],
  controllers: [PlayersController],
  providers: [
    PlayersService,
    PrismaService,
    {
      provide: 'MeiliSearch',
      useFactory: (configService: ConfigService) => {
        const { host, apiKey } = configService.get<Config>(
          ConfigKey.MEILISEARCH,
        );

        return new MeiliSearch({
          host,
          apiKey,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [PlayersService],
})
export class PlayersModule {}
