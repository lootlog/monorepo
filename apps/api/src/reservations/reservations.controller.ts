import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { DiscordId } from "@lootlog/nest-shared/decorators";
import { type Guild, Permission } from "src/generated/prisma/client";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import { AuthGuard } from "@lootlog/nest-shared";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";
import { CreateReservationDto } from "./dto/create-reservation.dto";
import {
  ReservationResponseDto,
  ReservationsCardsResponseDto,
  ReservationsResponseDto,
} from "./dto/reservation-response.dto";
import { ReservationsService } from "./reservations.service";

@ApiTags("reservations")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("guilds/:guildId/reservations")
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Permissions(Permission.LOOTLOG_RESERVATIONS_READ)
  @UseGuards(PermissionsGuard)
  @Get()
  @ApiOperation({
    summary: "Get reservations",
    description: "Retrieve reservations for a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "List of reservations",
    type: ReservationsResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  getReservations(@GuildData() guild: Guild) {
    return this.reservationsService.getReservations(guild.id);
  }

  @Permissions(Permission.LOOTLOG_RESERVATIONS_WRITE)
  @UseGuards(PermissionsGuard)
  @Post()
  @ApiOperation({
    summary: "Create reservation",
    description: "Create a new reservation to a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 201,
    description: "Reservation created successfully",
    type: ReservationResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  createReservation(
    @Body() data: CreateReservationDto,
    @GuildData() guild: Guild,
  ) {
    return this.reservationsService.createReservation(guild.id, data);
  }

  @Permissions(Permission.LOOTLOG_RESERVATIONS_WRITE)
  @UseGuards(PermissionsGuard)
  @Delete(":reservationRecordId")
  @ApiOperation({
    summary: "Delete reservation",
    description: "Deletes a reservation the user owns or can moderate",
  })
  @ApiParam({
    name: "reservationRecordId",
    description: "Reservation record identifier",
    example: 123,
  })
  @ZodResponse({
    status: 200,
    description: "Reservation deleted successfully",
    type: ReservationResponseDto,
  })
  deleteReservation(
    @Param("reservationRecordId", ParseIntPipe) reservationRecordId: number,
    @GuildData() guild: Guild,
    @DiscordId() discordId: string,
    @Req() request: Request & { permissions?: Permission[]; guild?: Guild },
  ) {
    return this.reservationsService.deleteReservation({
      guildId: guild.id,
      reservationRecordId,
      actorDiscordId: discordId,
      actorIsOwner: request.guild?.ownerId === discordId,
      permissions: request.permissions ?? [],
    });
  }

  @Permissions(Permission.LOOTLOG_RESERVATIONS_READ)
  @UseGuards(PermissionsGuard)
  @Get("cards")
  @ApiOperation({
    summary: "Get reservations cards",
    description: "Retrieve reservations cards",
  })
  @ZodResponse({
    status: 200,
    description: "List of reservations cards",
    type: ReservationsCardsResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  getReservationsCards() {
    return this.reservationsService.getReservationsCards();
  }
}
