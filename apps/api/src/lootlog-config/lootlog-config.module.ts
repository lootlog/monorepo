import { forwardRef, Module } from '@nestjs/common';
import { LootlogConfigController } from './lootlog-config.controller';
import { LootlogConfigService } from './lootlog-config.service';
import { PrismaService } from 'src/db/prisma.service';
import { MembersModule } from 'src/members/members.module';
import { DiscordModule } from 'src/discord/discord.module';
import { GuildsModule } from 'src/guilds/guilds.module';

@Module({
  imports: [MembersModule, DiscordModule, forwardRef(() => GuildsModule)],
  controllers: [LootlogConfigController],
  providers: [LootlogConfigService, PrismaService],
  exports: [LootlogConfigService],
})
export class LootlogConfigModule {}
