import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { UserId } from 'src/shared/decorators/user-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { CreateOrUpdateLootlogCharacterConfigDto } from 'src/user-lootlog-config/dto/create-user-account-config.dto';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';
import { UserLootlogConfigEntity } from 'src/shared/entities/user-lootlog-config.entity';

@ApiTags('user-lootlog-config')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users/@me/lootlog-config')
export class UserLootlogConfigController {
  constructor(
    private readonly userLootlogConfigService: UserLootlogConfigService,
  ) {}

  @Get('accounts/:accountId')
  @ApiOperation({
    summary: 'Get user lootlog configuration',
    description: 'Retrieve lootlog configuration for a specific account',
  })
  @ApiParam({
    name: 'accountId',
    description: 'Account ID',
    example: 'account_123',
  })
  @ApiResponse({
    status: 200,
    description: 'User lootlog configuration',
    type: UserLootlogConfigEntity,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getUserLootlogConfigByAccountId(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Param('accountId') accountId: string,
  ) {
    const configs = await this.userLootlogConfigService.getLootlogAccountConfig(
      discordId,
      accountId,
      userId,
    );

    const serialized = Object.entries(configs).reduce(
      (acc, [characterId, config]) => {
        return {
          ...acc,
          [characterId]: plainToInstance(UserLootlogConfigEntity, config),
        };
      },
      {},
    );

    return serialized;
  }

  @Put('accounts/:accountId')
  @ApiOperation({
    summary: 'Create or update lootlog character configuration',
    description: 'Create or update lootlog configuration for a character',
  })
  @ApiParam({
    name: 'accountId',
    description: 'Account ID',
    example: 'account_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration created/updated successfully',
    type: UserLootlogConfigEntity,
  })
  async createOrUpdateLootlogCharacterConfig(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Param('accountId') accountId: string,
    @Body() data: CreateOrUpdateLootlogCharacterConfigDto,
  ) {
    const config =
      await this.userLootlogConfigService.createOrUpdateLootlogCharacterConfig(
        discordId,
        accountId,
        userId,
        data,
      );

    return plainToInstance(UserLootlogConfigEntity, config);
  }
}
