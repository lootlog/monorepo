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
import { Permission } from "src/db/domain";
import { GuildsService } from "src/guilds/guilds.service";
import { CreatePartyGatheringDto } from "src/messaging/dto/create-party-gathering.dto";
import { PartyReadyRoomApplicationDto } from "src/messaging/ready-room/dto/party-ready-room-application.dto";
import { PartyReadyRoomResolveInvitationTargetsDto } from "src/messaging/ready-room/dto/party-ready-room-invitation.dto";
import { PartyReadyRoomObservationDto } from "src/messaging/ready-room/dto/party-ready-room-observation.dto";
import {
  PartyReadyRoomExpectedRevisionDto,
  PartyReadyRoomParticipantActionDto,
  PartyReadyRoomParticipantIdentityDto,
} from "src/messaging/ready-room/dto/party-ready-room-participant-action.dto";
import {
  PartyReadyRoomClientUpdateDto,
  PartyReadyRoomInvitationTargetsDto,
  PartyReadyRoomProjectionDto,
} from "src/messaging/ready-room/dto/party-ready-room-projection.dto";
import { ReadyRoomService } from "src/messaging/ready-room/ready-room.service";
import { AuthGuard } from "@lootlog/nest-shared";

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
    return this.readyRoomService.join({
      notificationId,
      participantDiscordId: discordId,
      character: data.character,
      world: data.world,
      accessibleGuildIds: await this.getAccessibleGuildIds(discordId),
    });
  }

  @Delete(":notificationId/applications/me")
  @ZodResponse({ status: 200, type: PartyReadyRoomClientUpdateDto })
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

  @Delete(":notificationId/participants")
  @ZodResponse({ status: 200, type: PartyReadyRoomClientUpdateDto })
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

  @Post(":notificationId/invitations/targets")
  @ZodResponse({ status: 201, type: PartyReadyRoomInvitationTargetsDto })
  async resolveInvitationTargets(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomResolveInvitationTargetsDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    return this.readyRoomService.resolveInvitationTargets({
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

  @Post(":notificationId/cancel")
  @ZodResponse({ status: 201, type: PartyReadyRoomClientUpdateDto })
  async cancel(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: PartyReadyRoomExpectedRevisionDto,
  ) {
    await this.assertAccess(notificationId, discordId);
    return this.readyRoomService.cancel({
      ...data,
      notificationId,
      organizerDiscordId: discordId,
    });
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
