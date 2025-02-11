import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DiscordModule } from 'src/discord/discord.module';
import { GuildsModule } from 'src/guilds/guilds.module';
import { MembersModule } from 'src/members/members.module';
import { PrismaService } from 'src/db/prisma.service';

@Module({
  imports: [DiscordModule, GuildsModule, MembersModule],
  providers: [UsersService, PrismaService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
