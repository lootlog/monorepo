import { Controller, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { Permission } from "#src/generated/prisma/client";
import { AuthGuard } from "@lootlog/nest-shared";
import { Permissions } from "#src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";
import { RefreshStatsCardResponseDto } from "./dto/refresh-stats-card-response.dto.js";
import { PublicGuildStatsCardService } from "./public-guild-stats-card.service.js";

@ApiTags("guild-stats-card")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("guilds")
export class AuthenticatedGuildStatsCardController {
  constructor(private readonly statsCardService: PublicGuildStatsCardService) {}

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Post(":guildId/stats-card/refresh")
  @HttpCode(200)
  @ApiOperation({
    summary: "Refresh public guild stats card",
    description:
      "Regenerate the public guild stats card and update the cached PNG.",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ZodResponse({
    status: 200,
    description: "Stats card refreshed",
    type: RefreshStatsCardResponseDto,
  })
  @ApiResponse({ status: 404, description: "Guild not found or card disabled" })
  @ApiResponse({ status: 429, description: "Stats card refresh rate limited" })
  refreshStatsCard(@Param("guildId") guildId: string) {
    return this.statsCardService.refreshStatsCard(guildId);
  }
}
