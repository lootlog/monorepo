import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { AllService } from "./all.service.js";
import { SearchAllResponseDto } from "./dto/search-all-response.schema.js";
import { SearchAllDto } from "./dto/search-all.dto.js";

@ApiTags("All")
@Controller("all")
export class AllController {
  constructor(private readonly allService: AllService) {}

  @Get()
  @ApiOperation({ summary: "Search across all categories" })
  @ZodResponse({
    status: 200,
    type: SearchAllResponseDto,
    description: "Aggregated search results across items, players, and NPCs",
  })
  searchAll(@Query() query: SearchAllDto) {
    return this.allService.searchAll(query);
  }
}
