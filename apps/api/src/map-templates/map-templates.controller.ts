import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { Permission } from "prisma/generated/client";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";
import { MapTemplatesService } from "./map-templates.service";
import { CreateMapTemplateDto } from "./dto/create-map-template.dto";
import { GuildData } from "src/shared/decorators/guild-data.decorator";

@ApiTags("map-templates")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class MapTemplatesController {
  constructor(private readonly mapTemplatesService: MapTemplatesService) {}

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/map-templates")
  @ApiOperation({
    summary: "Get map templates",
    description: "Get all map templates for this guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiResponse({
    status: 200,
    description: "List of map templates",
  })
  async getTemplates(@GuildData() guildData: { id: string }) {
    return this.mapTemplatesService.getTemplates(guildData.id);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/map-templates")
  @ApiOperation({
    summary: "Create map template",
    description: "Create a new reusable map template",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiResponse({
    status: 201,
    description: "Template created successfully",
  })
  async createTemplate(
    @GuildData() guildData: { id: string },
    @Body() data: CreateMapTemplateDto,
  ) {
    return this.mapTemplatesService.createTemplate(guildData.id, data);
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/map-templates/:templateId")
  @ApiOperation({
    summary: "Delete map template",
    description: "Delete a map template",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "templateId", description: "Template ID" })
  @ApiResponse({
    status: 200,
    description: "Template deleted successfully",
  })
  async deleteTemplate(
    @GuildData() guildData: { id: string },
    @Param("templateId") templateId: string,
  ) {
    return this.mapTemplatesService.deleteTemplate(guildData.id, templateId);
  }
}
