import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';

@Module({
  imports: [],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
