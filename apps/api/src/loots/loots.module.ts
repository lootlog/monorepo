import { Module } from '@nestjs/common';
import { LootsController } from './loots.controller';
import { LootsService } from './loots.service';
import { MembersModule } from 'src/members/members.module';
import { PlayersModule } from 'src/players/players.module';
import { NpcsModule } from 'src/npcs/npcs.module';
import { GuildsModule } from 'src/guilds/guilds.module';
import { LootlogConfigModule } from 'src/lootlog-config/lootlog-config.module';
import { UserLootlogConfigModule } from 'src/user-lootlog-config/user-lootlog-config.module';
import { PrismaModule } from 'src/db/prisma.module';
import { RedisModule } from 'src/lib/redis/redis.module';
import { LootCreationService } from './services/loot-creation.service';
import { LootValidationService } from './services/loot-validation.service';
import { LootShareService } from './services/loot-share.service';
import { LootCommentService } from './services/loot-comment.service';
import { LootQueryService } from './services/loot-query.service';

@Module({
  imports: [
    MembersModule,
    PlayersModule,
    NpcsModule,
    GuildsModule,
    LootlogConfigModule,
    UserLootlogConfigModule,
    PrismaModule,
    RedisModule,
  ],
  controllers: [LootsController],
  providers: [
    LootsService,
    LootCreationService,
    LootValidationService,
    LootShareService,
    LootCommentService,
    LootQueryService,
  ],
})
export class LootsModule {}
