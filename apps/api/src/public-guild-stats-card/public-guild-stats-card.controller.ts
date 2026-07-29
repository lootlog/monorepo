import { Controller, Get, Param, Res } from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { serviceConfig } from "src/config/service.config";
import { RuntimeEnvironment } from "@lootlog/types";
import { PublicGuildStatsCardService } from "./public-guild-stats-card.service";

const CACHE_CONTROL_HEADER = "public, max-age=300, must-revalidate";
const LOCAL_CACHE_CONTROL_HEADER = "no-store";

@ApiTags("public-guild-stats-card")
@Controller("public/guilds")
export class PublicGuildStatsCardController {
  constructor(private readonly statsCardService: PublicGuildStatsCardService) {}

  @Get(":guildId/stats-card.png")
  @ApiOperation({
    summary: "Get public guild loot stats card",
    description:
      "Generate a public PNG image with lightweight loot statistics for a guild.",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiProduces("image/png")
  @ApiResponse({ status: 200, description: "PNG stats card" })
  @ApiResponse({ status: 404, description: "Guild not found" })
  async getStatsCard(
    @Param("guildId") guildId: string,
    @Res() reply: FastifyReply,
  ) {
    const image = await this.statsCardService.getStatsCard(guildId);

    return reply
      .header("Content-Type", "image/png")
      .header("Cache-Control", this.getCacheControlHeader())
      .send(image);
  }

  private getCacheControlHeader() {
    if (serviceConfig.env === RuntimeEnvironment.LOCAL) {
      return LOCAL_CACHE_CONTROL_HEADER;
    }

    return CACHE_CONTROL_HEADER;
  }
}
