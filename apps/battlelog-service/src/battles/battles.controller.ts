import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BattlesService } from 'src/battles/battles.service';
import { CreateBattleDto } from 'src/battles/dto/create-battle.dto';
import { QueryBattlesDto } from 'src/battles/dto/query-battles.dto';
import { QueryBattleAnalyticsDto } from 'src/battles/dto/query-battle-analytics.dto';
import { UpdateBattleDto } from 'src/battles/dto/update-battle.dto';
import { UserId } from 'src/shared/decorators/user-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { BattleAccessGuard } from 'src/shared/guards/battle-access.guard';
import { BattleOwnerGuard } from 'src/shared/guards/battle-owner.guard';

@UseGuards(AuthGuard)
@Controller('battles')
export class BattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  @Post('/')
  createBattle(
    @Body() createBattleDto: CreateBattleDto,
    @UserId() userId: string,
  ) {
    return this.battlesService.createBattle({
      data: createBattleDto,
      userId,
    });
  }

  @Get('/@me')
  getDashboardBattles(
    @Query() query: QueryBattlesDto,
    @UserId() userId: string,
  ) {
    return this.battlesService.getDashboardBattles(query, userId);
  }

  @Get('/@me/characters')
  getUserCharacters(@UserId() userId: string) {
    return this.battlesService.getUserCharacters(userId);
  }

  @Get('/@me/analytics')
  getBattleAnalytics(
    @Query() query: QueryBattleAnalyticsDto,
    @UserId() userId: string,
  ) {
    return this.battlesService.getBattleAnalytics(query, userId);
  }

  @Get('/@me/warriors/search')
  searchWarriors(@Query('q') query: string, @UserId() userId: string) {
    return this.battlesService.searchWarriors(query, userId);
  }

  @Get('/@me/worlds')
  getUserWorlds(@UserId() userId: string) {
    return this.battlesService.getUserWorlds(userId);
  }

  @UseGuards(BattleAccessGuard)
  @Get('/:battleId')
  getBattle(@Param('battleId') battleId: string, @UserId() userId: string) {
    return this.battlesService.getBattleFromDatabase(battleId, userId);
  }

  @UseGuards(BattleAccessGuard)
  @Get('/:battleId/raw')
  getBattleRawData(
    @Param('battleId') battleId: string,
    @UserId() userId: string,
  ) {
    return this.battlesService.getBattleRawData(battleId, userId);
  }

  @UseGuards(BattleOwnerGuard)
  @Patch('/:battleId')
  updateBattle(
    @Param('battleId') battleId: string,
    @Body() updateBattleDto: UpdateBattleDto,
  ) {
    return this.battlesService.updateBattle(battleId, updateBattleDto);
  }

  @UseGuards(BattleOwnerGuard)
  @Delete('/:battleId')
  deleteBattle(@Param('battleId') battleId: string) {
    return this.battlesService.deleteBattle(battleId);
  }
}

@Controller('battles/public')
export class PublicBattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  @Get('/:battleId')
  getPublicBattle(@Param('battleId') battleId: string) {
    return this.battlesService.getPublicBattle(battleId);
  }

  @Get('/:battleId/raw')
  getPublicBattleRaw(@Param('battleId') battleId: string) {
    return this.battlesService.getPublicBattleRaw(battleId);
  }
}
