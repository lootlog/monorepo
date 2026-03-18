import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
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
  @ApiResponse({
    status: 200,
    description: "List of maps",
  })
  async getMaps() {
    return this.mapsService.getMaps();
  }
}
