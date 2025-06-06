import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { CreateOrUpdateLootlogCharacterConfigDto } from 'src/user-lootlog-config/dto/create-user-account-config.dto';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';

@UseGuards(AuthGuard)
@Controller('users')
export class UserLootlogConfigController {
  constructor(
    private readonly userLootlogConfigService: UserLootlogConfigService,
  ) {}

  @Get('/@me/lootlog-config/accounts/:accountId')
  async getUserLootlogConfigByAccountId(
    @DiscordId() discordId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.userLootlogConfigService.getLootlogAccountConfig(
      discordId,
      accountId,
    );
  }

  @Put('/@me/lootlog-config/accounts/:accountId')
  async createOrUpdateLootlogCharacterConfig(
    @DiscordId() discordId: string,
    @Param('accountId') accountId: string,
    @Body() data: CreateOrUpdateLootlogCharacterConfigDto,
  ) {
    return this.userLootlogConfigService.createOrUpdateLootlogCharacterConfig(
      discordId,
      accountId,
      data,
    );
  }
}
