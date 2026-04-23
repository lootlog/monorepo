import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
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
  @ApiQuery({
    name: "filter",
    required: false,
    style: "form",
    explode: true,
    schema: {
      anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
    },
  })
  @ApiQuery({
    name: "facets",
    required: false,
    style: "form",
    explode: true,
    schema: { type: "array", items: { type: "string" } },
  })
  @ApiQuery({
    name: "sort",
    required: false,
    style: "form",
    explode: true,
    schema: { type: "array", items: { type: "string" } },
  })
  @ZodResponse({
    status: 200,
    type: SearchItemsResponseDto,
    description: "Item search results",
  })
  getItems(@Query() query: GetItemsDto) {
    return this.itemsService.searchItems(query);
  }
}
