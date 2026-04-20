import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { GetItemsDto } from "./dto/get-items.dto";
import { ItemHitDto } from "./dto/item-hit.schema";
import { ItemsService } from "./items.service";

@ApiTags("Items")
@Controller("items")
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  @ApiOperation({ summary: "Search items by name" })
  @ZodResponse({
    status: 200,
    type: [ItemHitDto],
    description: "List of matching items",
  })
  getItems(@Query() query: GetItemsDto) {
    return this.itemsService.getItems(query);
  }
}
