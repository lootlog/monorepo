import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserId } from 'src/shared/decorators/user-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { UsersService } from 'src/users/users.service';

@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/@me')
  async getUserProfile(@UserId() userId: string) {
    return this.usersService.getUserProfile(userId);
  }

  @Get('/@me/guilds')
  async getUserGuilds(@UserId() userId: string) {
    return this.usersService.getUserGuilds(userId);
  }

  @Get('/@me/guilds/manageable')
  async getManageableGuilds(
    @UserId() userId: string,
    @Query('skipConfigured') skipConfigured: boolean,
  ) {
    return this.usersService.getManageableGuilds(userId, { skipConfigured });
  }
}
