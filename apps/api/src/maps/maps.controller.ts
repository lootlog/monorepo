import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { GameMapResponseDto } from "src/shared/dto/game-map-response.dto";
import { MapsService } from "./maps.service";

@ApiTags("maps")
@Controller("maps")
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get()
  @ApiOperation({
    summary: "Get all game maps",
    description:
      "Returns a list of all game maps from Margonem, cached for 1 hour",
  })
  @ZodResponse({
    status: 200,
    description: "List of maps",
    type: [GameMapResponseDto],
  })
  getMaps() {
    return this.mapsService.getMaps();
  }
}
