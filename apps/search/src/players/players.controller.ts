import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { GetPlayersDto } from "./dto/get-players.dto";
import { PlayerHitDto } from "./dto/player-hit.schema";
import { PlayersService } from "./players.service";

@ApiTags("Players")
@Controller("players")
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  @ApiOperation({ summary: "Search players by name" })
  @ZodResponse({
    status: 200,
    type: [PlayerHitDto],
    description: "List of matching players",
  })
  getPlayers(@Query() query: GetPlayersDto) {
    return this.playersService.getPlayers(query);
  }
}
