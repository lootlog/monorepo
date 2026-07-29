import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { UserId } from "@lootlog/nest-shared/decorators";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { AuthGuard } from "@lootlog/nest-shared";
import { UpdateSoundSettingsDto } from "./dto/update-sound-settings.dto";
import { SoundSettingsService } from "src/sound-settings/sound-settings.service";
import { SoundSettingsResponseDto } from "./dto/sound-settings-response.dto";

@ApiTags("sound-settings")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("sound-settings")
export class SoundSettingsController {
  constructor(private readonly soundSettingsService: SoundSettingsService) {}

  @Get()
  @ApiOperation({
    summary: "Get sound settings",
    description: "Retrieve user sound settings",
  })
  @ZodResponse({
    status: 200,
    description: "User sound settings",
    type: SoundSettingsResponseDto,
  })
  getSettings(@UserId() userId: string) {
    return this.soundSettingsService.getSettings(userId);
  }

  @Patch()
  @ApiOperation({
    summary: "Update sound settings",
    description: "Update user sound settings",
  })
  @ZodResponse({
    status: 200,
    description: "Updated sound settings",
    type: SoundSettingsResponseDto,
  })
  updateSettings(
    @UserId() userId: string,
    @Body() dto: UpdateSoundSettingsDto,
  ) {
    return this.soundSettingsService.updateSettings(userId, dto);
  }
}
