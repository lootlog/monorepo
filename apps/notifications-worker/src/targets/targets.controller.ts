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
import { TargetsService } from "./targets.service";
import { CreateTargetDto } from "./dto/create-target.dto";
import { UpdateTargetDto } from "./dto/update-target.dto";

@ApiTags("targets")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("targets")
export class TargetsController {
  constructor(private readonly targetsService: TargetsService) {}

  @Post()
  @ApiOperation({ summary: "Create a notification target" })
  create(@Body() dto: CreateTargetDto) {
    return this.targetsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List notification targets by owner" })
  findByOwner(
    @Query("ownerType") ownerType: string,
    @Query("ownerId") ownerId: string,
  ) {
    return this.targetsService.findByOwner(ownerType, ownerId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a notification target" })
  async update(
    @DiscordId() discordId: string,
    @Param("id") id: string,
    @Body() dto: UpdateTargetDto,
  ) {
    const existing = await this.targetsService.findById(id);
    if (!existing) {
      throw new NotFoundException("Target not found");
    }
    if (existing.ownerType === "user" && existing.ownerId !== discordId) {
      throw new ForbiddenException();
    }

    return this.targetsService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a notification target" })
  async delete(@DiscordId() discordId: string, @Param("id") id: string) {
    const existing = await this.targetsService.findById(id);
    if (!existing) {
      throw new NotFoundException("Target not found");
    }
    if (existing.ownerType === "user" && existing.ownerId !== discordId) {
      throw new ForbiddenException();
    }

    return this.targetsService.delete(id);
  }
}
