import { AuthGuard } from "@lootlog/nest-shared";
import { DiscordId, UserId } from "@lootlog/nest-shared/decorators";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  ParseIntPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { MyReservationsQueryDto } from "./dto/reservation-query.dto.js";
import {
  MyReservationsResponseDto,
  ReservationResponseDto,
} from "./dto/reservation-response.dto.js";
import { UpdateReservationDto } from "./dto/update-reservation.dto.js";
import { ReservationMutationsService } from "./reservation-mutations.service.js";
import { ReservationsService } from "./reservations.service.js";

@ApiTags("reservations")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("users/@me/reservations")
export class UserReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly reservationMutationsService: ReservationMutationsService,
  ) {}

  @Get()
  @ApiOperation({
    operationId: "listMyReservations",
    summary: "List the current user's reservations",
  })
  @ZodResponse({ status: 200, type: MyReservationsResponseDto })
  listMyReservations(
    @UserId() userId: string,
    @DiscordId() discordId: string,
    @Query() query: MyReservationsQueryDto,
  ) {
    return this.reservationsService.listMine({ userId, discordId, query });
  }

  @Patch(":reservationId")
  @ApiOperation({
    operationId: "updateMyReservation",
    summary: "Update one of the current user's reservations",
  })
  @ZodResponse({ status: 200, type: ReservationResponseDto })
  updateMyReservation(
    @UserId() userId: string,
    @DiscordId() discordId: string,
    @Param("reservationId", ParseIntPipe) reservationId: number,
    @Body() data: UpdateReservationDto,
  ) {
    return this.reservationMutationsService.updateOwned({
      userId,
      discordId,
      reservationId,
      data,
    });
  }

  @Delete(":reservationId")
  @HttpCode(204)
  @ApiOperation({
    operationId: "deleteMyReservation",
    summary: "Cancel one of the current user's reservations",
  })
  @ApiResponse({ status: 204, description: "Reservation deleted" })
  async deleteMyReservation(
    @UserId() userId: string,
    @DiscordId() discordId: string,
    @Param("reservationId", ParseIntPipe) reservationId: number,
  ) {
    await this.reservationMutationsService.deleteOwned({
      userId,
      discordId,
      reservationId,
    });
  }
}
