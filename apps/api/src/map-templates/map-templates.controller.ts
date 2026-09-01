import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { Permission } from "#src/generated/prisma/client";
import { AuthGuard, RequiresCapabilities } from "@lootlog/nest-shared";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";
import { MapTemplatesService } from "./map-templates.service.js";
import { CreateMapTemplateDto } from "./dto/create-map-template.dto.js";
import { GuildData } from "#src/shared/decorators/guild-data.decorator";
import { StatusOkResponseDto } from "#src/shared/dto/common-response.dto";
import { MapTemplateResponseDto } from "#src/shared/dto/map-template-response.dto";

@ApiTags("map-templates")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class MapTemplatesController {
  constructor(private readonly mapTemplatesService: MapTemplatesService) {}

  @RequiresCapabilities(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/map-templates")
  @ApiOperation({
    summary: "Get map templates",
    description: "Get all map templates for this guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ZodResponse({
    status: 200,
    description: "List of map templates",
    type: [MapTemplateResponseDto],
  })
  getTemplates(@GuildData() guildData: { id: string }) {
    return this.mapTemplatesService.getTemplates(guildData.id);
  }

  @RequiresCapabilities(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/map-templates")
  @ApiOperation({
    summary: "Create map template",
    description: "Create a new reusable map template",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ZodResponse({
    status: 201,
    description: "Template created successfully",
    type: MapTemplateResponseDto,
  })
  createTemplate(
    @GuildData() guildData: { id: string },
    @Body() data: CreateMapTemplateDto,
  ) {
    return this.mapTemplatesService.createTemplate(guildData.id, data);
  }

  @RequiresCapabilities(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Put("/guilds/:guildId/map-templates/:templateId")
  @ApiOperation({
    summary: "Update map template",
    description: "Update an existing reusable map template",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "templateId", description: "Template ID" })
  @ZodResponse({
    status: 200,
    description: "Template updated successfully",
    type: MapTemplateResponseDto,
  })
  updateTemplate(
    @GuildData() guildData: { id: string },
    @Param("templateId") templateId: string,
    @Body() data: CreateMapTemplateDto,
  ) {
    return this.mapTemplatesService.updateTemplate(
      guildData.id,
      templateId,
      data,
    );
  }

  @RequiresCapabilities(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/map-templates/:templateId")
  @ApiOperation({
    summary: "Delete map template",
    description: "Delete a map template",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "templateId", description: "Template ID" })
  @ZodResponse({
    status: 200,
    description: "Template deleted successfully",
    type: StatusOkResponseDto,
  })
  deleteTemplate(
    @GuildData() guildData: { id: string },
    @Param("templateId") templateId: string,
  ) {
    return this.mapTemplatesService.deleteTemplate(guildData.id, templateId);
  }
}
