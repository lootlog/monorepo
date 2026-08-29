import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { GetNpcsDto } from "./dto/get-npcs.dto.js";
import { NpcHitDto } from "./dto/npc-hit.schema.js";
import { NpcsService } from "./npcs.service.js";

@ApiTags("NPCs")
@Controller("npcs")
export class NpcsController {
  constructor(private readonly npcsService: NpcsService) {}

  @Get()
  @ApiOperation({ summary: "Search NPCs by name" })
  @ZodResponse({
    status: 200,
    type: [NpcHitDto],
    description: "List of matching NPCs",
  })
  getNpcs(@Query() query: GetNpcsDto) {
    return this.npcsService.getNpcs(query);
  }
}
