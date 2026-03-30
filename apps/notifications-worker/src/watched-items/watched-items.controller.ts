import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuthGuard } from "src/shared/guards/auth.guard";
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
  create(@Req() req: any, @Body() dto: CreateWatchedItemDto) {
    return this.watchedItemsService.create(req.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List watched items for a user" })
  findByUser(@Query("userId") userId: string) {
    return this.watchedItemsService.findByUser(userId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Remove a watched item" })
  async delete(@Req() req: any, @Param("id") id: string) {
    const deleted = await this.watchedItemsService.delete(id, req.userId);
    if (!deleted) {
      throw new NotFoundException("Watched item not found");
    }
    return deleted;
  }
}
