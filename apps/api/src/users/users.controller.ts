import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserId } from 'src/shared/decorators/user-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { UsersService } from 'src/users/users.service';

@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/@me/scopes')
  async getUserIdpTokenScopes(@UserId() userId: string) {
    return this.usersService.getUserIdpTokenScopes(userId);
  }
}
