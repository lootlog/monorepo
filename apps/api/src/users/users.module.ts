import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { GuildsModule } from 'src/guilds/guilds.module';
import { MembersModule } from 'src/members/members.module';
import { DiscordModule } from 'src/discord/discord.module';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/db/prisma.module';

@Module({
  imports: [
    GuildsModule,
    MembersModule,
    DiscordModule,
    AuthModule,
    PrismaModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
