import { db as prismaDb } from "#src/prisma/db";
import type { FieldOutputTypes } from "../prisma/contract.js";
import { AuthGuard } from "@lootlog/nest-shared";
import { DiscordId, UserId } from "@lootlog/nest-shared/decorators";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { GuildData } from "#src/shared/decorators/guild-data.decorator";
import { Permissions } from "#src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";
import {
  AcceptReservationShareInvitationDto,
  AcceptReservationShareInvitationResponseDto,
  CreateReservationShareInvitationResponseDto,
  ReservationShareInvitationPreviewResponseDto,
  ReservationSharesResponseDto,
} from "./dto/reservation-sharing.dto.js";
import { ReservationSharingService } from "./reservation-sharing.service.js";

type Guild = FieldOutputTypes["public"]["Guild"];
const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

@ApiTags("reservation-sharing")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class ReservationSharingController {
  constructor(
    private readonly reservationSharingService: ReservationSharingService,
  ) {}

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/reservation-shares")
  @ApiOperation({
    operationId: "listReservationShares",
    summary: "List reservation calendar partners and pending invitations",
  })
  @ZodResponse({ status: 200, type: ReservationSharesResponseDto })
  listReservationShares(@GuildData() guild: Guild) {
    return this.reservationSharingService.list(guild.id);
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/reservation-share-invitations")
  @ApiOperation({
    operationId: "createReservationShareInvitation",
    summary: "Create a single-use reservation sharing invitation",
  })
  @ZodResponse({
    status: 201,
    type: CreateReservationShareInvitationResponseDto,
  })
  createReservationShareInvitation(
    @GuildData() guild: Guild,
    @UserId() userId: string,
  ) {
    return this.reservationSharingService.createInvitation(guild.id, userId);
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/reservation-share-invitations/:invitationId")
  @HttpCode(204)
  @ApiOperation({
    operationId: "revokeReservationShareInvitation",
    summary: "Revoke a pending reservation sharing invitation",
  })
  @ApiResponse({ status: 204, description: "Invitation revoked" })
  async revokeReservationShareInvitation(
    @GuildData() guild: Guild,
    @Param("invitationId") invitationId: string,
  ) {
    await this.reservationSharingService.revokeInvitation(
      guild.id,
      invitationId,
    );
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/reservation-shares/:shareId")
  @HttpCode(204)
  @ApiOperation({
    operationId: "revokeReservationShare",
    summary: "Stop sharing reservation calendars",
  })
  @ApiResponse({ status: 204, description: "Reservation share revoked" })
  async revokeReservationShare(
    @GuildData() guild: Guild,
    @Param("shareId") shareId: string,
  ) {
    await this.reservationSharingService.revokeShare(guild.id, shareId);
  }

  @Get("/reservation-share-invitations/:token")
  @ApiOperation({
    operationId: "previewReservationShareInvitation",
    summary: "Preview a reservation sharing invitation",
  })
  @ZodResponse({
    status: 200,
    type: ReservationShareInvitationPreviewResponseDto,
  })
  previewReservationShareInvitation(
    @Param("token") token: string,
    @DiscordId() discordId: string,
  ) {
    return this.reservationSharingService.previewInvitation(token, discordId);
  }

  @Post("/reservation-share-invitations/:token")
  @ApiOperation({
    operationId: "acceptReservationShareInvitation",
    summary: "Accept a reservation sharing invitation",
  })
  @ZodResponse({
    status: 201,
    type: AcceptReservationShareInvitationResponseDto,
  })
  acceptReservationShareInvitation(
    @Param("token") token: string,
    @Body() data: AcceptReservationShareInvitationDto,
    @UserId() userId: string,
    @DiscordId() discordId: string,
  ) {
    return this.reservationSharingService.acceptInvitation({
      token,
      targetGuildId: data.targetGuildId,
      userId,
      discordId,
    });
  }
}
