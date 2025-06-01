import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { MembersModule } from 'src/members/members.module';
import { GuildsModule } from 'src/guilds/guilds.module';
import { PrismaService } from 'src/db/prisma.service';

@Module({
  imports: [MembersModule, GuildsModule],
  controllers: [PlayersController],
  providers: [PlayersService, PrismaService],
  exports: [PlayersService],
})
export class PlayersModule {}
