import { Body, Controller, Get, Patch, Query, UseGuards } from "@nestjs/common";
import { UserId } from "@lootlog/nest-shared/decorators";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { AuthGuard } from "@lootlog/nest-shared";
import {
  GetSettingsDocumentsQueryDto,
  PatchSettingsDocumentsDto,
  SettingsDocumentsResponseDto,
} from "./dto/settings-documents.dto";
import { SettingsDocumentsService } from "./settings-documents.service";

@ApiTags("preferences")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("preferences")
export class SettingsDocumentsController {
  constructor(
    private readonly settingsDocumentsService: SettingsDocumentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get effective settings for multiple domains" })
  @ZodResponse({
    status: 200,
    description: "Effective settings, override layers and field sources",
    type: SettingsDocumentsResponseDto,
  })
  getPreferences(
    @UserId() userId: string,
    @Query() query: GetSettingsDocumentsQueryDto,
  ) {
    return this.settingsDocumentsService.getPreferences(userId, {
      domains: this.settingsDocumentsService.parseDomains(query.domains),
      gameAccountId: query.gameAccountId,
      characterId: query.characterId,
      guildId: query.guildId,
    });
  }

  @Patch()
  @ApiOperation({ summary: "Atomically patch settings in multiple domains" })
  @ZodResponse({
    status: 200,
    description: "Effective settings after applying the patch",
    type: SettingsDocumentsResponseDto,
  })
  patchPreferences(
    @UserId() userId: string,
    @Body() payload: PatchSettingsDocumentsDto,
  ) {
    return this.settingsDocumentsService.patchPreferences(userId, payload);
  }
}
