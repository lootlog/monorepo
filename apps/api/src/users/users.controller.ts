import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { DiscordId, UserId } from "@lootlog/nest-shared";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { StatusOkResponseDto } from "src/shared/dto/common-response.dto";
import { UserGameAccountPreferencesResponseDto } from "src/shared/dto/user-account-preferences-response.dto";
import { UserPreferencesResponseDto } from "src/shared/dto/user-preferences-response.dto";
import { UpdateUserGameAccountPreferencesDto } from "src/users/dto/update-user-account-preferences.dto";
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

  @Get("/@me/game-preferences/accounts/:accountId")
  @ApiOperation({
    summary: "Get user game account preferences",
    description:
      "Retrieve account-scoped game preferences for a specific Margonem account",
  })
  @ApiParam({
    name: "accountId",
    description: "Margonem account ID",
    example: "1234567",
  })
  @ZodResponse({
    status: 200,
    description: "User game account preferences",
    type: UserGameAccountPreferencesResponseDto,
  })
  async getUserGameAccountPreferences(
    @UserId() userId: string,
    @Param("accountId") accountId: string,
  ) {
    return this.usersService.getUserGameAccountPreferences(userId, accountId);
  }

  @Patch("/@me/game-preferences/accounts/:accountId")
  @ApiOperation({
    summary: "Update user game account preferences",
    description:
      "Update account-scoped game preferences for a specific Margonem account",
  })
  @ApiParam({
    name: "accountId",
    description: "Margonem account ID",
    example: "1234567",
  })
  @ZodResponse({
    status: 200,
    description: "Updated user game account preferences",
    type: UserGameAccountPreferencesResponseDto,
  })
  async updateUserGameAccountPreferences(
    @UserId() userId: string,
    @Param("accountId") accountId: string,
    @Body() preferences: UpdateUserGameAccountPreferencesDto,
  ) {
    return this.usersService.updateUserGameAccountPreferences(
      userId,
      accountId,
      preferences,
    );
  }
}
