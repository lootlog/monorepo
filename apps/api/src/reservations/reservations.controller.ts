import { AuthGuard } from "@lootlog/nest-shared";
import { DiscordId, UserId } from "@lootlog/nest-shared/decorators";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { type Guild, Permission } from "src/generated/prisma/client";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";
import { CreateReservationDto } from "./dto/create-reservation.dto";
import { ReservationWindowQueryDto } from "./dto/reservation-query.dto";
import {
  ReservationResponseDto,
  ReservationSpotsResponseDto,
  ReservationWindowResponseDto,
} from "./dto/reservation-response.dto";
import type { ReservationViewerContext } from "./reservation-viewer";
import { ReservationMutationsService } from "./reservation-mutations.service";
import { ReservationsService } from "./reservations.service";

type ReservationRequest = {
  permissions?: Permission[];
  guild?: Guild;
};

function createViewerContext(options: {
  guild: Guild;
  userId: string;
  discordId: string;
  request: ReservationRequest;
}): ReservationViewerContext {
  return {
    guildId: options.guild.id,
    userId: options.userId,
    discordId: options.discordId,
    actorIsOwner: options.request.guild?.ownerId === options.discordId,
    permissions: options.request.permissions ?? [],
  };
}

@ApiTags("reservations")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class ReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly reservationMutationsService: ReservationMutationsService,
  ) {}

  @Permissions(Permission.LOOTLOG_RESERVATIONS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/reservation-spots")
  @ApiOperation({
    operationId: "listReservationSpots",
    summary: "List reservation spots with current availability",
  })
  @ZodResponse({ status: 200, type: ReservationSpotsResponseDto })
  listReservationSpots(
    @GuildData() guild: Guild,
    @UserId() userId: string,
    @DiscordId() discordId: string,
    @Req() request: ReservationRequest,
  ) {
    return this.reservationsService.listSpots(
      createViewerContext({ guild, userId, discordId, request }),
    );
  }

  @Permissions(Permission.LOOTLOG_RESERVATIONS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/reservation-spots/:spotId/reservations")
  @ApiOperation({
    operationId: "listSpotReservations",
    summary: "List reservations for one spot and time window",
  })
  @ZodResponse({ status: 200, type: ReservationWindowResponseDto })
  listSpotReservations(
    @GuildData() guild: Guild,
    @UserId() userId: string,
    @DiscordId() discordId: string,
    @Req() request: ReservationRequest,
    @Param("spotId") spotId: string,
    @Query() query: ReservationWindowQueryDto,
  ) {
    return this.reservationsService.listWindow(
      createViewerContext({ guild, userId, discordId, request }),
      spotId,
      query.from,
      query.to,
    );
  }

  @Permissions(Permission.LOOTLOG_RESERVATIONS_WRITE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/reservation-spots/:spotId/reservations")
  @ApiOperation({
    operationId: "createReservation",
    summary: "Create a reservation owned by the authenticated user",
  })
  @ZodResponse({ status: 201, type: ReservationResponseDto })
  createReservation(
    @GuildData() guild: Guild,
    @UserId() userId: string,
    @DiscordId() discordId: string,
    @Req() request: ReservationRequest,
    @Param("spotId") spotId: string,
    @Body() data: CreateReservationDto,
  ) {
    return this.reservationMutationsService.create({
      context: createViewerContext({ guild, userId, discordId, request }),
      spotId,
      data,
    });
  }

  @Permissions(Permission.LOOTLOG_RESERVATIONS_WRITE)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/reservations/:reservationId")
  @HttpCode(204)
  @ApiOperation({
    operationId: "deleteReservation",
    summary: "Cancel an owned or locally moderated reservation",
  })
  @ApiResponse({ status: 204, description: "Reservation deleted" })
  async deleteReservation(
    @GuildData() guild: Guild,
    @UserId() userId: string,
    @DiscordId() discordId: string,
    @Req() request: ReservationRequest,
    @Param("reservationId", ParseIntPipe) reservationId: number,
  ) {
    await this.reservationMutationsService.deleteVisible({
      context: createViewerContext({ guild, userId, discordId, request }),
      reservationId,
    });
  }

  @Permissions(Permission.LOOTLOG_RESERVATIONS_READ)
  @UseGuards(PermissionsGuard)
  @Put("/guilds/:guildId/reservation-spot-pins/:spotId")
  @HttpCode(204)
  @ApiOperation({
    operationId: "pinReservationSpot",
    summary: "Pin a reservation spot for the current user",
  })
  @ApiResponse({ status: 204, description: "Spot pinned" })
  async pinReservationSpot(
    @GuildData() guild: Guild,
    @UserId() userId: string,
    @Param("spotId") spotId: string,
  ) {
    await this.reservationsService.pinSpot(userId, guild.id, spotId);
  }

  @Permissions(Permission.LOOTLOG_RESERVATIONS_READ)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/reservation-spot-pins/:spotId")
  @HttpCode(204)
  @ApiOperation({
    operationId: "unpinReservationSpot",
    summary: "Unpin a reservation spot for the current user",
  })
  @ApiResponse({ status: 204, description: "Spot unpinned" })
  async unpinReservationSpot(
    @GuildData() guild: Guild,
    @UserId() userId: string,
    @Param("spotId") spotId: string,
  ) {
    await this.reservationsService.unpinSpot(userId, guild.id, spotId);
  }
}
