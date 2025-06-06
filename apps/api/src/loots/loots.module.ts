import { Module } from '@nestjs/common';
import { LootsController } from './loots.controller';
import { LootsService } from './loots.service';
import { MembersModule } from 'src/members/members.module';
import { PlayersModule } from 'src/players/players.module';
import { NpcsModule } from 'src/npcs/npcs.module';
import { GuildsModule } from 'src/guilds/guilds.module';
import { PrismaService } from 'src/db/prisma.service';
import { LootlogConfigModule } from 'src/lootlog-config/lootlog-config.module';
import { UserLootlogConfigModule } from 'src/user-lootlog-config/user-lootlog-config.module';

@Module({
  imports: [
    MembersModule,
    PlayersModule,
    NpcsModule,
    GuildsModule,
    LootlogConfigModule,
    UserLootlogConfigModule,
  ],
  controllers: [LootsController],
  providers: [LootsService, PrismaService],
})
export class LootsModule {}
