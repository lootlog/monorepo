import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { CreateOrUpdateLootlogCharacterConfigDto } from 'src/user-lootlog-config/dto/create-user-account-config.dto';
import { CreateUserLootlogConfigDto } from 'src/user-lootlog-config/dto/create-user-lootlog-config.dto';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';

@UseGuards(AuthGuard)
@Controller('users')
export class UserLootlogConfigController {
  constructor(
    private readonly userLootlogConfigService: UserLootlogConfigService,
  ) {}

  @Get('/@me/lootlog-config')
  async getUserLootlogConfig(@DiscordId() discordId: string) {
    return this.userLootlogConfigService.getUserLootlogConfig(discordId);
  }

  @Post('/@me/lootlog-config')
  async createUserLootlogConfig(
    @DiscordId() discordId: string,
    @Body() data: CreateUserLootlogConfigDto,
  ) {
    return this.userLootlogConfigService.createUserLootlogConfig(
      discordId,
      data,
    );
  }

  @Get('/@me/lootlog-config/accounts/:accountId')
  async getUserLootlogConfigByAccountId(
    @DiscordId() discordId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.userLootlogConfigService.getLootlogCharacterConfig(
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
