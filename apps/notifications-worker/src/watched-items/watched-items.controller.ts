import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuthGuard, DiscordId } from "@lootlog/nest-shared";
import { WatchedItemsService } from "./watched-items.service";
import { CreateWatchedItemDto } from "./dto/create-watched-item.dto";

@ApiTags("watched-items")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("watched-items")
export class WatchedItemsController {
  constructor(private readonly watchedItemsService: WatchedItemsService) {}

  @Post()
  @ApiOperation({ summary: "Add a watched item" })
  create(@DiscordId() discordId: string, @Body() dto: CreateWatchedItemDto) {
    return this.watchedItemsService.create(discordId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List watched items for a user" })
  findByUser(@DiscordId() discordId: string) {
    return this.watchedItemsService.findByUser(discordId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Remove a watched item" })
  async delete(@DiscordId() discordId: string, @Param("id") id: string) {
    const deleted = await this.watchedItemsService.delete(id, discordId);
    if (!deleted) {
      throw new NotFoundException("Watched item not found");
    }
    return deleted;
  }
}
