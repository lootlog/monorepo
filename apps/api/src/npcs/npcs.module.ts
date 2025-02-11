import { Module } from '@nestjs/common';
import { NpcsController } from './npcs.controller';
import { NpcsService } from './npcs.service';
import { MembersModule } from 'src/members/members.module';
import { DiscordModule } from 'src/discord/discord.module';
import { GuildsModule } from 'src/guilds/guilds.module';
import { PrismaService } from 'src/db/prisma.service';
import { ConfigService } from '@nestjs/config';
import MeiliSearch, { Config } from 'meilisearch';
import { ConfigKey } from 'src/config/config-key.enum';

@Module({
  imports: [MembersModule, DiscordModule, GuildsModule],
  controllers: [NpcsController],
  providers: [
    NpcsService,
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
  exports: [NpcsService],
})
export class NpcsModule {}
