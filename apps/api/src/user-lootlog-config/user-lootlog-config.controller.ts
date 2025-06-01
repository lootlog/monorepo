import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserId } from 'src/shared/decorators/user-id.decorator';
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
  async getUserLootlogConfig(@UserId() userId: string) {
    return this.userLootlogConfigService.getUserLootlogConfig(userId);
  }

  //   @Get('/@me/lootlog-config/account/:accountId')
  //   async getUserLootlogConfigByAccountId(
  //     @UserId() userId: string,
  //     @Param('accountId') accountId: string,
  //   ) {
  //     return this.userLootlogConfigService.getUserLootlogConfigByAccountId(
  //       userId,
  //       +accountId,
  //     );
  //   }

  // @Get('/@me/lootlog-config/player/:playerId')
  // async getUserLootlogConfigByPlayerId(
  //   @UserId() userId: string,
  //   @Param('playerId') playerId: string,
  // ) {
  //   return this.userLootlogConfigService.getUserLootlogConfigByPlayerId(
  //     userId,
  //     playerId,
  //   );
  // }

  @Post('/@me/lootlog-config')
  async createUserLootlogConfig(
    @UserId() userId: string,
    @Body() data: CreateUserLootlogConfigDto,
  ) {
    return this.userLootlogConfigService.createUserLootlogConfig(userId, data);
  }
}
