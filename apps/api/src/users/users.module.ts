import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { GuildsModule } from 'src/guilds/guilds.module';
import { MembersModule } from 'src/members/members.module';
import { PrismaService } from 'src/db/prisma.service';
import { DiscordModule } from 'src/discord/discord.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [GuildsModule, MembersModule, DiscordModule, AuthModule],
  providers: [UsersService, PrismaService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
