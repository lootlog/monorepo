import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { Auth0Module } from 'src/auth0/auth0.module';

@Module({
  imports: [Auth0Module],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
