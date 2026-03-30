import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuthGuard, DiscordId } from "@lootlog/nest-shared";
import { RulesService } from "./rules.service";
import { CreateRuleDto } from "./dto/create-rule.dto";
import { UpdateRuleDto } from "./dto/update-rule.dto";

@ApiTags("rules")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("rules")
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post()
  @ApiOperation({ summary: "Create a notification rule" })
  create(@Body() dto: CreateRuleDto) {
    return this.rulesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List notification rules by owner" })
  findByOwner(
    @Query("ownerType") ownerType: string,
    @Query("ownerId") ownerId: string,
  ) {
    return this.rulesService.findByOwner(ownerType, ownerId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a notification rule by ID" })
  async findById(@Param("id") id: string) {
    const rule = await this.rulesService.findById(id);
    if (!rule) {
      throw new NotFoundException("Rule not found");
    }
    return rule;
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a notification rule" })
  async update(
    @DiscordId() discordId: string,
    @Param("id") id: string,
    @Body() dto: UpdateRuleDto,
  ) {
    const existing = await this.rulesService.findById(id);
    if (!existing) {
      throw new NotFoundException("Rule not found");
    }
    if (existing.ownerType === "user" && existing.ownerId !== discordId) {
      throw new ForbiddenException();
    }

    return this.rulesService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a notification rule" })
  async delete(@DiscordId() discordId: string, @Param("id") id: string) {
    const existing = await this.rulesService.findById(id);
    if (!existing) {
      throw new NotFoundException("Rule not found");
    }
    if (existing.ownerType === "user" && existing.ownerId !== discordId) {
      throw new ForbiddenException();
    }

    return this.rulesService.delete(id);
  }
}
