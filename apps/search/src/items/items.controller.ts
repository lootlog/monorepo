import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { GetItemsDto } from "./dto/get-items.dto";
import { SearchItemsResponseDto } from "./dto/search-items-response.schema";
import { ItemsService } from "./items.service";

@ApiTags("Items")
@Controller("items")
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  @ApiOperation({ summary: "Search items with filters, sorting, and facets" })
  @ZodResponse({
    status: 200,
    type: SearchItemsResponseDto,
    description: "Item search results",
  })
  getItems(@Query() query: GetItemsDto) {
    return this.itemsService.searchItems(query);
  }
}
