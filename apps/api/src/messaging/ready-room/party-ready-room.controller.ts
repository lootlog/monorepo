import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DiscordId } from "@lootlog/nest-shared/decorators";
import { ZodResponse } from "nestjs-zod";
import { Permission } from "src/generated/prisma/client";
import { GuildsService } from "src/guilds/guilds.service";
import { CreatePartyGatheringDto } from "src/messaging/dto/create-party-gathering.dto";
import { PartyReadyRoomApplicationDto } from "src/messaging/ready-room/dto/party-ready-room-application.dto";
import {
  PartyReadyRoomAcknowledgeInvitationDto,
  PartyReadyRoomAnnotateInvitationDto,
  PartyReadyRoomReconcileInvitationDto,
  PartyReadyRoomReserveInvitationsDto,
} from "src/messaging/ready-room/dto/party-ready-room-invitation.dto";
import { PartyReadyRoomObservationDto } from "src/messaging/ready-room/dto/party-ready-room-observation.dto";
import {
  PartyReadyRoomExpectedRevisionDto,
  PartyReadyRoomParticipantActionDto,
  PartyReadyRoomParticipantIdentityDto,
} from "src/messaging/ready-room/dto/party-ready-room-participant-action.dto";
import {
  PartyReadyRoomInvitationReservationDto,
  PartyReadyRoomProjectionDto,
} from "src/messaging/ready-room/dto/party-ready-room-projection.dto";
import { PartyReadyRoomReadyResponseDto } from "src/messaging/ready-room/dto/party-ready-room-ready-check.dto";
import { ReadyRoomService } from "src/messaging/ready-room/ready-room.service";
import { AuthGuard } from "src/shared/guards/auth.guard";

const READY_ROOM_PERMISSIONS = [
  Permission.LOOTLOG_NOTIFICATIONS_SEND,
  Permission.OWNER,
  Permission.ADMIN,
  Permission.LOOTLOG_MANAGE,
];

@ApiTags("party-ready-room")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("messaging/party-gathering")
export class PartyReadyRoomController {
  constructor(
    private readonly readyRoomService: ReadyRoomService,
    private readonly guildsService: GuildsService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a party gathering Ready Room" })
  @ZodResponse({ status: 201, type: PartyReadyRoomProjectionDto })
  async create(
    @DiscordId() discordId: string,
    @Body() data: CreatePartyGatheringDto,
  ) {
    const accessibleGuildIds = await this.getAccessibleGuildIds(discordId);
    const guildIds = data.guildIds.filter((guildId) =>
      accessibleGuildIds.includes(guildId),
    );
    if (guildIds.length === 0) throw new ForbiddenException();
    return this.readyRoomService.create({
      organizerDiscordId: discordId,
      organizerCharacter: data.character,
      guildIds,
      world: data.world,
      description: data.description,
      minLvl: data.minLvl,
      maxLvl: data.maxLvl,
    });
  }

  @Get()
  @ZodResponse({ status: 200, type: [PartyReadyRoomProjectionDto] })
  async list(@DiscordId() discordId: string) {
    return this.readyRoomService.list({
      viewerDiscordId: discordId,
      accessibleGuildIds: await this.getAccessibleGuildIds(discordId),
    });
  }

  @Get(":notificationId")
  @ZodResponse({ status: 200, type: PartyReadyRoomProjectionDto })
  async get(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
  ) {
    return this.readyRoomService.get({
      notificationId,
      viewerDiscordId: discordId,
      accessibleGuildIds: await this.getAccessibleGuildIds(discordId),
    });
  }

  @Post(":notificationId/applications")
  @ZodResponse({ status: 201, type: PartyReadyRoomProjectionDto })
  async apply(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomApplicationDto,
  ) {
    return this.readyRoomService.apply({
      notificationId,
      participantDiscordId: discordId,
      character: data.character,
      world: data.world,
      accessibleGuildIds: await this.getAccessibleGuildIds(discordId),
    });
  }

  @Delete(":notificationId/applications/me")
  @ZodResponse({ status: 200, type: PartyReadyRoomProjectionDto })
  async withdraw(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomParticipantIdentityDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    return this.readyRoomService.withdraw({
      notificationId,
      participantDiscordId: discordId,
      participantId: data.participantId,
    });
  }

  @Post(":notificationId/participants/accept")
  @ZodResponse({ status: 201, type: PartyReadyRoomProjectionDto })
  async accept(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomParticipantActionDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    return this.readyRoomService.accept({
      ...data,
      notificationId,
      organizerDiscordId: discordId,
    });
  }

  @Post(":notificationId/participants/decline")
  @ZodResponse({ status: 201, type: PartyReadyRoomProjectionDto })
  async decline(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomParticipantActionDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    return this.readyRoomService.decline({
      ...data,
      notificationId,
      organizerDiscordId: discordId,
    });
  }

  @Delete(":notificationId/participants")
  @ZodResponse({ status: 200, type: PartyReadyRoomProjectionDto })
  async remove(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomParticipantActionDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    return this.readyRoomService.remove({
      ...data,
      notificationId,
      organizerDiscordId: discordId,
    });
  }

  @Post(":notificationId/ready-check")
  @ZodResponse({ status: 201, type: PartyReadyRoomProjectionDto })
  async startReadyCheck(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomExpectedRevisionDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    return this.readyRoomService.startReadyCheck({
      ...data,
      notificationId,
      organizerDiscordId: discordId,
    });
  }

  @Post(":notificationId/ready-check/respond")
  @ZodResponse({ status: 201, type: PartyReadyRoomProjectionDto })
  async respondToReadyCheck(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomReadyResponseDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    return this.readyRoomService.respondToReadyCheck({
      ...data,
      notificationId,
      participantDiscordId: discordId,
    });
  }

  @Post(":notificationId/invitations/reserve")
  @ZodResponse({ status: 201, type: PartyReadyRoomInvitationReservationDto })
  async reserveInvitations(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomReserveInvitationsDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    return this.readyRoomService.reserveInvitations({
      ...data,
      notificationId,
      organizerDiscordId: discordId,
    });
  }

  @Post(":notificationId/invitations/acknowledge")
  @ZodResponse({ status: 201, type: PartyReadyRoomProjectionDto })
  async acknowledgeInvitation(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomAcknowledgeInvitationDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    return this.readyRoomService.acknowledgeInvitation({
      ...data,
      notificationId,
      organizerDiscordId: discordId,
    });
  }

  @Post(":notificationId/invitations/annotate")
  @ZodResponse({ status: 201, type: PartyReadyRoomProjectionDto })
  async annotateInvitation(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomAnnotateInvitationDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    return this.readyRoomService.annotateInvitation({
      ...data,
      notificationId,
      organizerDiscordId: discordId,
    });
  }

  @Post(":notificationId/invitations/reconcile")
  @ZodResponse({ status: 201, type: PartyReadyRoomProjectionDto })
  async reconcileInvitation(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomReconcileInvitationDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    return this.readyRoomService.reconcileInvitation({
      ...data,
      notificationId,
      organizerDiscordId: discordId,
    });
  }

  @Post(":notificationId/party-observation")
  @ZodResponse({ status: 201, type: PartyReadyRoomProjectionDto })
  async observeParty(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomObservationDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    return this.readyRoomService.observeParty({
      ...data,
      notificationId,
      organizerDiscordId: discordId,
    });
  }

  @Post(":notificationId/close")
  @ZodResponse({ status: 201, type: PartyReadyRoomProjectionDto })
  async close(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomExpectedRevisionDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    const result = await this.readyRoomService.close({
      ...data,
      notificationId,
      organizerDiscordId: discordId,
    });
    return result.projection;
  }

  @Post(":notificationId/cancel")
  @ZodResponse({ status: 201, type: PartyReadyRoomProjectionDto })
  async cancel(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomExpectedRevisionDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    const result = await this.readyRoomService.cancel({
      ...data,
      notificationId,
      organizerDiscordId: discordId,
    });
    return result.projection;
  }

  private async assertAccess(
    notificationId: string,
    discordId: string,
  ): Promise<void> {
    await this.readyRoomService.get({
      notificationId,
      viewerDiscordId: discordId,
      accessibleGuildIds: await this.getAccessibleGuildIds(discordId),
    });
  }

  private async getAccessibleGuildIds(discordId: string): Promise<string[]> {
    const guilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      READY_ROOM_PERMISSIONS,
    );
    return guilds.map(({ id }) => id);
  }
}
