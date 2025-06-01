import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
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
}
