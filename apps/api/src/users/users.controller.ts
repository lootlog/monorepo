import { Controller, Get, UseGuards } from '@nestjs/common';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { UsersService } from 'src/users/users.service';

@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // @Get('/@me/guilds')
  // async getUserGuilds(@DiscordId() discordId: string) {
  //   return this.usersService.getUserGuilds(discordId);
  // }
}
