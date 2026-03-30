import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuthGuard } from "src/shared/guards/auth.guard";
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
  async update(@Param("id") id: string, @Body() dto: UpdateTargetDto) {
    const target = await this.targetsService.update(id, dto);
    if (!target) {
      throw new NotFoundException("Target not found");
    }
    return target;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a notification target" })
  async delete(@Param("id") id: string) {
    const deleted = await this.targetsService.delete(id);
    if (!deleted) {
      throw new NotFoundException("Target not found");
    }
    return deleted;
  }
}
