import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { DiscordId } from "@lootlog/nest-shared/decorators";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { CreateOrUpdateLootlogCharacterConfigDto } from "src/user-lootlog-config/dto/create-user-account-config.dto";
import { UserLootlogConfigService } from "src/user-lootlog-config/user-lootlog-config.service";
import {
  UserLootlogConfigAccountResponseDto,
  UserLootlogPlayersCatchingGuildsRequestDto,
  UserLootlogPlayersCatchingGuildsResponseDto,
  UserLootlogPlayerCatchingGuildsResponseDto,
  UserLootlogConfigResponseDto,
} from "src/shared/dto/user-lootlog-config-response.dto";

@ApiTags("user-lootlog-config")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("users/@me/lootlog-config")
export class UserLootlogConfigController {
  constructor(
    private readonly userLootlogConfigService: UserLootlogConfigService,
  ) {}

  @Get("accounts/:accountId")
  @ApiOperation({
    summary: "Get user lootlog configuration",
    description: "Retrieve lootlog configuration for a specific account",
  })
  @ApiParam({
    name: "accountId",
    description: "Account ID",
    example: "account_123",
  })
  @ZodResponse({
    status: 200,
    description: "User lootlog configuration",
    type: UserLootlogConfigAccountResponseDto,
  })
  @ApiResponse({ status: 404, description: "Configuration not found" })
  getUserLootlogConfigByAccountId(
    @DiscordId() discordId: string,
    @Param("accountId") accountId: string,
  ) {
    return this.userLootlogConfigService.getLootlogAccountConfig(
      discordId,
      accountId,
    );
  }

  @Get("players/:userId/:accountId/:characterId/catching-guilds")
  @ApiOperation({
    summary: "Get visible player catching guilds",
    description:
      "Retrieve shared accessible Lootlog guilds where a player has catching enabled",
  })
  @ApiParam({
    name: "userId",
    description: "Hovered player Discord ID",
    example: "123456789012345678",
  })
  @ApiParam({
    name: "accountId",
    description: "Hovered player account ID",
    example: "9822301",
  })
  @ApiParam({
    name: "characterId",
    description: "Hovered player character ID",
    example: "617",
  })
  @ZodResponse({
    status: 200,
    description: "Visible player catching guilds",
    type: UserLootlogPlayerCatchingGuildsResponseDto,
  })
  getPlayerCatchingGuilds(
    @DiscordId() discordId: string,
    @Param("userId") userId: string,
    @Param("accountId") accountId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.userLootlogConfigService.getPlayerCatchingGuilds(
      discordId,
      userId,
      accountId,
      characterId,
    );
  }

  @Post("players/catching-guilds/batch")
  @HttpCode(200)
  @ApiOperation({
    summary: "Get visible players catching guilds",
    description:
      "Retrieve shared accessible Lootlog guilds where visible players have catching enabled",
  })
  @ZodResponse({
    status: 200,
    description: "Visible players catching guilds",
    type: UserLootlogPlayersCatchingGuildsResponseDto,
  })
  getPlayersCatchingGuilds(
    @DiscordId() discordId: string,
    @Body() data: UserLootlogPlayersCatchingGuildsRequestDto,
  ) {
    return this.userLootlogConfigService.getPlayersCatchingGuilds(
      discordId,
      data,
    );
  }

  @Put("accounts/:accountId")
  @ApiOperation({
    summary: "Create or update lootlog character configuration",
    description: "Create or update lootlog configuration for a character",
  })
  @ApiParam({
    name: "accountId",
    description: "Account ID",
    example: "account_123",
  })
  @ZodResponse({
    status: 200,
    description: "Configuration created/updated successfully",
    type: UserLootlogConfigResponseDto,
  })
  createOrUpdateLootlogCharacterConfig(
    @DiscordId() discordId: string,
    @Param("accountId") accountId: string,
    @Body() data: CreateOrUpdateLootlogCharacterConfigDto,
  ) {
    return this.userLootlogConfigService.createOrUpdateLootlogCharacterConfig(
      discordId,
      accountId,
      data,
    );
  }
}
