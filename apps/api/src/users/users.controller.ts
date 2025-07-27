import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UserId } from 'src/shared/decorators/user-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { UpdateUserPreferencesDto } from 'src/users/dto/update-user-preferences.dto';
import { UsersService } from 'src/users/users.service';

@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/@me/scopes')
  async getUserIdpTokenScopes(@UserId() userId: string) {
    return this.usersService.getUserIdpTokenScopes(userId);
  }

  @Get('/@me/preferences')
  async getUserPreferences(@UserId() userId: string) {
    return this.usersService.getUserPreferences(userId);
  }

  @Patch('/@me/preferences')
  async updateUserPreferences(
    @UserId() userId: string,
    @Body() preferences: UpdateUserPreferencesDto,
  ) {
    return this.usersService.updateUserPreferences(userId, preferences);
  }
}
