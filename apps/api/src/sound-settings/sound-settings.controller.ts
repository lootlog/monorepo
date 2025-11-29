import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { UserId } from 'src/shared/decorators/user-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { UpdateSoundSettingsDto } from './dto/update-sound-settings.dto';
import { SoundSettingsService } from 'src/sound-settings/sound-settings.service';
import { SoundSettingsEntity } from 'src/sound-settings/entities/sound-settings.entity';

@ApiTags('sound-settings')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('sound-settings')
export class SoundSettingsController {
  constructor(private readonly soundSettingsService: SoundSettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get sound settings',
    description: 'Retrieve user sound settings',
  })
  @ApiResponse({
    status: 200,
    description: 'User sound settings',
    type: SoundSettingsEntity,
  })
  async getSettings(@UserId() userId: string) {
    const settings = await this.soundSettingsService.getSettings(userId);
    return plainToInstance(SoundSettingsEntity, settings);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update sound settings',
    description: 'Update user sound settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated sound settings',
    type: SoundSettingsEntity,
  })
  async updateSettings(
    @UserId() userId: string,
    @Body() dto: UpdateSoundSettingsDto,
  ) {
    const settings = await this.soundSettingsService.updateSettings(
      userId,
      dto,
    );
    return plainToInstance(SoundSettingsEntity, settings);
  }
}
