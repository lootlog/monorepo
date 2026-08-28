import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { type Guild, Permission } from "src/db/domain";
import { UpdateLootlogConfigNpcDto } from "src/lootlog-config/dto/update-lootlog-config-npc.dto";
import { LootlogConfigService } from "src/lootlog-config/lootlog-config.service";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import { AuthGuard } from "@lootlog/nest-shared";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";
import { NullableLootlogConfigResponseDto } from "src/shared/dto/lootlog-config-response.dto";
import { LootlogConfigNpcResponseDto } from "src/shared/dto/lootlog-config-npc-response.dto";

@ApiTags("lootlog-config")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("guilds/:guildId/lootlog-config")
export class LootlogConfigController {
  constructor(private readonly lootlogConfigService: LootlogConfigService) {}

  @Permissions(Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Get()
  @ApiOperation({
    summary: "Get lootlog configuration",
    description: "Retrieve lootlog configuration for a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "Lootlog configuration",
    type: NullableLootlogConfigResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - admin permission required",
  })
  @ApiResponse({ status: 404, description: "Configuration not found" })
  getLootlogConfig(@GuildData() guild: Guild) {
    return this.lootlogConfigService.getLootlogConfig(guild.id);
  }

  @Permissions(Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Put(":npcId")
  @ApiOperation({
    summary: "Update NPC configuration",
    description:
      "Update allowed rarities for a specific NPC type in lootlog configuration",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({
    name: "npcId",
    description: "NPC configuration ID",
    example: "1",
  })
  @ZodResponse({
    status: 200,
    description: "NPC configuration updated successfully",
    type: LootlogConfigNpcResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - admin permission required",
  })
  @ApiResponse({ status: 404, description: "NPC configuration not found" })
  updateNpc(
    @GuildData() guild: Guild,
    @Param("npcId") npcId: string,
    @Body() data: UpdateLootlogConfigNpcDto,
  ) {
    return this.lootlogConfigService.updateNpc(guild.id, npcId, data);
  }
}
