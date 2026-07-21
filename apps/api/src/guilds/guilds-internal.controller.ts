import { Controller, Get, Headers, Param, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { UserGuildPermissionsDto } from "src/guilds/dto/user-guild-permissions.dto";
import { GuildsService } from "src/guilds/guilds.service";
import { GuildResponseDto } from "src/shared/dto/guild-response.dto";
import {
  DEV_PERMISSION_OVERRIDE_HEADER,
  parseDevPermissionOverrideHeader,
} from "src/shared/permissions/dev-permission-override";

@ApiTags("internal")
@Controller("internal/guilds")
export class GuildsInternalController {
  constructor(private readonly guildsService: GuildsService) {}

  @Get("user-permissions")
  @ApiOperation({
    summary: "[Internal] Get user guilds with permissions",
    description:
      "Internal endpoint for gateway service to retrieve user guilds with permissions. Does not require authentication.",
  })
  @ApiQuery({
    name: "discordId",
    required: true,
    description: "Discord user ID",
  })
  @ApiQuery({ name: "userId", required: true, description: "User ID" })
  @ApiResponse({
    status: 200,
    description: "List of user guilds with permissions",
    type: [UserGuildPermissionsDto],
  })
  getUserPermissions(
    @Query("discordId") discordId: string,
    @Query("userId") userId: string,
    @Headers(DEV_PERMISSION_OVERRIDE_HEADER) devPermissionOverride?: string,
  ): Promise<UserGuildPermissionsDto[]> {
    if (!discordId || !userId) {
      return Promise.resolve([]);
    }

    const guildPermissionOptions = {
      devPermissionOverride: parseDevPermissionOverrideHeader(
        devPermissionOverride,
      ),
    };

    return this.guildsService.getUserGuildsWithPermissions(
      discordId,
      userId,
      guildPermissionOptions,
    );
  }

  @Get(":idOrVanityUrl")
  @ApiOperation({
    summary: "[Internal] Get guild by ID or vanity URL",
    description:
      "Internal endpoint for services that need to resolve a guild identifier to its canonical guild data.",
  })
  @ApiParam({
    name: "idOrVanityUrl",
    required: true,
    description: "Guild ID or vanity URL",
  })
  @ZodResponse({
    status: 200,
    description: "Resolved guild data",
    type: GuildResponseDto,
  })
  getGuildByIdOrVanityUrl(@Param("idOrVanityUrl") idOrVanityUrl: string) {
    return this.guildsService.getGuildById(idOrVanityUrl);
  }
}
