import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { DiscordId, UserId } from "@lootlog/nest-shared";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { StatusOkResponseDto } from "src/shared/dto/common-response.dto";
import { UserPreferencesResponseDto } from "src/shared/dto/user-preferences-response.dto";
import { UpdateUserPreferencesDto } from "src/users/dto/update-user-preferences.dto";
import { UsersService } from "src/users/users.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Delete("/@me")
  @ApiOperation({
    summary: "Delete user account",
    description: "Permanently delete user account and associated data",
  })
  @ZodResponse({
    status: 200,
    description: "Account deleted",
    type: StatusOkResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: "Account deletion is temporarily unavailable",
  })
  async deleteAccount(
    @UserId() authUserId: string,
    @DiscordId() discordId: string,
  ) {
    await this.usersService.deleteAccount({ authUserId, discordId });
    return { status: "OK" as const };
  }

  @Get("/@me/preferences")
  @ApiOperation({
    summary: "Get user preferences",
    description: "Retrieve user preferences",
  })
  @ZodResponse({
    status: 200,
    description: "User preferences",
    type: UserPreferencesResponseDto,
  })
  async getUserPreferences(@UserId() userId: string) {
    return this.usersService.getUserPreferences(userId);
  }

  @Patch("/@me/preferences")
  @ApiOperation({
    summary: "Update user preferences",
    description: "Update user preferences",
  })
  @ZodResponse({
    status: 200,
    description: "Updated user preferences",
    type: UserPreferencesResponseDto,
  })
  async updateUserPreferences(
    @UserId() userId: string,
    @Body() preferences: UpdateUserPreferencesDto,
  ) {
    const updatedPreferences = await this.usersService.updateUserPreferences(
      userId,
      preferences,
    );
    return updatedPreferences;
  }
}
