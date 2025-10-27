import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { UserId } from 'src/shared/decorators/user-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import type { UpdateUserPreferencesDto } from 'src/users/dto/update-user-preferences.dto';
import { UsersService } from 'src/users/users.service';
import { UserPreferencesEntity } from 'src/shared/entities/user-preferences.entity';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/@me/preferences')
  @ApiOperation({
    summary: 'Get user preferences',
    description: 'Retrieve user preferences',
  })
  @ApiResponse({ status: 200, description: 'User preferences' })
  async getUserPreferences(@UserId() userId: string) {
    const preferences = await this.usersService.getUserPreferences(userId);
    return plainToInstance(UserPreferencesEntity, preferences);
  }

  @Patch('/@me/preferences')
  @ApiOperation({
    summary: 'Update user preferences',
    description: 'Update user preferences',
  })
  @ApiResponse({ status: 200, description: 'Updated user preferences' })
  async updateUserPreferences(
    @UserId() userId: string,
    @Body() preferences: UpdateUserPreferencesDto,
  ) {
    const updatedPreferences = await this.usersService.updateUserPreferences(
      userId,
      preferences,
    );
    return plainToInstance(UserPreferencesEntity, updatedPreferences);
  }
}
