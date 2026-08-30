import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  resolveReservationSettings,
  type ReservationSettings,
} from "@lootlog/reservations";
import { PrismaService } from "#src/db/prisma.service";
import { Prisma, type Reservation } from "#src/generated/prisma/client";
import { GuildsService } from "#src/guilds/guilds.service";
import type { CreateReservationDto } from "./dto/create-reservation.dto.js";
import type { UpdateReservationDto } from "./dto/update-reservation.dto.js";
import { ReservationCatalogService } from "./reservation-catalog.service.js";
import { ReservationEventsPublisher } from "./reservation-events.publisher.js";
import {
  getDiscordAvatarUrl,
  presentReservation,
} from "./reservation-presentation.js";
import { validateReservationTime } from "./reservation-policy.js";
import { ReservationReminderService } from "./reservation-reminder.service.js";
import { ReservationSharingService } from "./reservation-sharing.service.js";
import {
  canModerateReservations,
  type ReservationViewerContext,
} from "./reservation-viewer.js";

type ReservationRange = {
  startsAt: Date;
  endsAt: Date;
};

type DeletePersistedReservationOptions = {
  reservation: Reservation;
  audienceGuildIds: string[];
  actorDiscordId: string;
};

@Injectable()
export class ReservationMutationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guildsService: GuildsService,
    private readonly catalogService: ReservationCatalogService,
    private readonly sharingService: ReservationSharingService,
    private readonly reminderService: ReservationReminderService,
    private readonly eventsPublisher: ReservationEventsPublisher,
  ) {}

  async create(options: {
    context: ReservationViewerContext;
    spotId: string;
    data: CreateReservationDto;
  }) {
    const { context, data } = options;
    const [spot, guild, settings, visibleGuildIds, member] = await Promise.all([
      this.catalogService.getSpot(options.spotId),
      this.prisma.guild.findUniqueOrThrow({
        where: { id: context.guildId },
      }),
      this.getReservationSettings(context.guildId),
      this.sharingService.getVisibleGuildIds(context.guildId),
      this.prisma.member.findFirst({
        where: {
          guildId: context.guildId,
          active: true,
          OR: [{ globalUserId: context.userId }, { userId: context.discordId }],
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    if (!member) {
      throw new ForbiddenException({ code: "RESERVATION_MEMBER_REQUIRED" });
    }

    const range = {
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
    };
    validateReservationTime({ ...range, settings });
    const reminderMinutesBefore = data.reminderMinutesBefore ?? null;
    const reminderContext = await this.reminderService.prepare({
      discordId: context.discordId,
      startsAt: range.startsAt,
      reminderMinutesBefore,
    });

    const created = await this.prisma.$transaction(
      async (transaction) => {
        await this.assertNoOverlap(transaction, {
          ...range,
          guildId: context.guildId,
          spotId: spot.id,
        });

        const activeReservationsCount = await transaction.reservation.count({
          where: {
            guildId: context.guildId,
            spotId: spot.id,
            endsAt: { gt: new Date() },
            OR: [
              { createdByUserId: context.userId },
              { legacyCreatedByDiscordId: context.discordId },
            ],
          },
        });
        if (activeReservationsCount >= settings.reservationActiveLimitPerSpot) {
          throw new UnprocessableEntityException({
            code: "ACTIVE_LIMIT_REACHED",
            limit: settings.reservationActiveLimitPerSpot,
          });
        }

        return transaction.reservation.create({
          data: {
            guildId: context.guildId,
            spotId: spot.id,
            spotName: spot.name,
            ...range,
            createdByUserId: context.userId,
            authorDisplayName: member.name,
            authorAvatarUrl: getDiscordAvatarUrl(
              context.discordId,
              member.avatar,
            ),
            reminderMinutesBefore,
            comment: data.comment || null,
          },
          include: { guild: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    try {
      await this.reminderService.schedule({
        context: reminderContext,
        discordId: context.discordId,
        reservationId: created.id,
        spotName: spot.name,
        organizationName: guild.name,
        startsAt: range.startsAt,
      });
    } catch (error) {
      await this.prisma.reservation.delete({ where: { id: created.id } });
      throw error;
    }

    await this.eventsPublisher.created({
      sourceGuildId: context.guildId,
      audienceGuildIds: visibleGuildIds,
      reservation: created,
      actorDiscordId: context.discordId,
    });

    return presentReservation(created, {
      guildId: context.guildId,
      userId: context.userId,
      discordId: context.discordId,
      canModerateCurrentGuild: canModerateReservations(context),
    });
  }

  async updateOwned(options: {
    userId: string;
    discordId: string;
    reservationId: number;
    data: UpdateReservationDto;
  }) {
    const accessibleGuilds =
      await this.guildsService.getCurrentUserAccessibleGuilds(
        options.discordId,
        options.userId,
      );
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: options.reservationId,
        guildId: { in: accessibleGuilds.map((guild) => guild.id) },
        OR: [
          { createdByUserId: options.userId },
          { legacyCreatedByDiscordId: options.discordId },
        ],
      },
      include: { guild: true },
    });
    if (!reservation) {
      throw new NotFoundException({ code: "RESERVATION_NOT_FOUND" });
    }

    const range = this.resolveUpdatedRange(reservation, options.data);
    const comment =
      options.data.comment === undefined
        ? reservation.comment
        : options.data.comment || null;
    const reminderMinutesBefore =
      options.data.reminderMinutesBefore === undefined
        ? reservation.reminderMinutesBefore
        : options.data.reminderMinutesBefore;
    const timeChanged =
      range.startsAt.getTime() !== reservation.startsAt.getTime() ||
      range.endsAt.getTime() !== reservation.endsAt.getTime();
    const reminderChanged =
      reminderMinutesBefore !== reservation.reminderMinutesBefore;
    const reminderNeedsReschedule = timeChanged || reminderChanged;

    const [settings, visibleGuildIds] = await Promise.all([
      this.getReservationSettings(reservation.guildId),
      this.sharingService.getVisibleGuildIds(reservation.guildId),
    ]);
    if (timeChanged) {
      validateReservationTime({
        ...range,
        settings,
        allowPastStart:
          range.startsAt.getTime() === reservation.startsAt.getTime(),
      });
    }

    const reminderContext = reminderNeedsReschedule
      ? await this.reminderService.prepare({
          discordId: options.discordId,
          startsAt: range.startsAt,
          reminderMinutesBefore,
        })
      : null;
    const previousReminderContext = await this.preparePreviousReminder({
      reservation,
      discordId: options.discordId,
      reminderNeedsReschedule,
    });

    const updated = await this.prisma.$transaction(
      async (transaction) => {
        if (timeChanged) {
          await this.assertNoOverlap(transaction, {
            ...range,
            guildId: reservation.guildId,
            spotId: reservation.spotId,
            excludedReservationId: reservation.id,
          });
        }

        return transaction.reservation.update({
          where: { id: reservation.id },
          data: {
            ...range,
            comment,
            reminderMinutesBefore,
          },
          include: { guild: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (reminderNeedsReschedule) {
      try {
        await this.reminderService.cancel(updated.id);
        await this.reminderService.schedule({
          context: reminderContext,
          discordId: options.discordId,
          reservationId: updated.id,
          spotName: updated.spotName,
          organizationName: updated.guild.name,
          startsAt: updated.startsAt,
        });
      } catch (error) {
        await this.restoreReservationAndReminder({
          reservation,
          discordId: options.discordId,
          previousReminderContext,
        });
        throw error;
      }
    }

    await this.eventsPublisher.updated({
      sourceGuildId: updated.guildId,
      audienceGuildIds: visibleGuildIds,
      reservation: updated,
      actorDiscordId: reservation.legacyCreatedByDiscordId ?? options.discordId,
    });

    return presentReservation(updated, {
      guildId: null,
      userId: options.userId,
      discordId: options.discordId,
      canModerateCurrentGuild: false,
    });
  }

  async deleteVisible(options: {
    context: ReservationViewerContext;
    reservationId: number;
  }): Promise<void> {
    const { context } = options;
    const visibleGuildIds = await this.sharingService.getVisibleGuildIds(
      context.guildId,
    );
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: options.reservationId,
        guildId: { in: visibleGuildIds },
      },
    });
    if (!reservation) {
      throw new NotFoundException({ code: "RESERVATION_NOT_FOUND" });
    }

    const isOwned =
      reservation.createdByUserId === context.userId ||
      reservation.legacyCreatedByDiscordId === context.discordId;
    const canModerateSource =
      reservation.guildId === context.guildId &&
      canModerateReservations(context);
    if (!isOwned && !canModerateSource) {
      throw new ForbiddenException({ code: "RESERVATION_DELETE_FORBIDDEN" });
    }

    const audienceGuildIds =
      reservation.guildId === context.guildId
        ? visibleGuildIds
        : await this.sharingService.getVisibleGuildIds(reservation.guildId);
    await this.deletePersistedReservation({
      reservation,
      audienceGuildIds,
      actorDiscordId: reservation.legacyCreatedByDiscordId ?? context.discordId,
    });
  }

  async deleteOwned(options: {
    userId: string;
    discordId: string;
    reservationId: number;
  }): Promise<void> {
    const accessibleGuilds =
      await this.guildsService.getCurrentUserAccessibleGuilds(
        options.discordId,
        options.userId,
      );
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: options.reservationId,
        guildId: { in: accessibleGuilds.map((guild) => guild.id) },
        OR: [
          { createdByUserId: options.userId },
          { legacyCreatedByDiscordId: options.discordId },
        ],
      },
    });
    if (!reservation) {
      throw new NotFoundException({ code: "RESERVATION_NOT_FOUND" });
    }

    const audienceGuildIds = await this.sharingService.getVisibleGuildIds(
      reservation.guildId,
    );
    await this.deletePersistedReservation({
      reservation,
      audienceGuildIds,
      actorDiscordId: reservation.legacyCreatedByDiscordId ?? options.discordId,
    });
  }

  private async assertNoOverlap(
    transaction: Prisma.TransactionClient,
    options: ReservationRange & {
      guildId: string;
      spotId: string;
      excludedReservationId?: number;
    },
  ): Promise<void> {
    const overlappingReservation = await transaction.reservation.findFirst({
      where: {
        ...(options.excludedReservationId === undefined
          ? {}
          : { id: { not: options.excludedReservationId } }),
        guildId: options.guildId,
        spotId: options.spotId,
        startsAt: { lt: options.endsAt },
        endsAt: { gt: options.startsAt },
      },
      select: { id: true },
    });
    if (overlappingReservation) {
      throw new ConflictException({ code: "RESERVATION_OVERLAP" });
    }
  }

  private resolveUpdatedRange(
    reservation: Reservation,
    data: UpdateReservationDto,
  ): ReservationRange {
    return {
      startsAt: data.startsAt ? new Date(data.startsAt) : reservation.startsAt,
      endsAt: data.endsAt ? new Date(data.endsAt) : reservation.endsAt,
    };
  }

  private preparePreviousReminder(options: {
    reservation: Reservation;
    discordId: string;
    reminderNeedsReschedule: boolean;
  }) {
    const { reservation } = options;
    if (!options.reminderNeedsReschedule) {
      return null;
    }
    if (reservation.reminderMinutesBefore === null) {
      return null;
    }

    const previousReminderScheduledFor = new Date(
      reservation.startsAt.getTime() -
        reservation.reminderMinutesBefore * 60_000,
    );
    if (previousReminderScheduledFor.getTime() <= Date.now()) {
      return null;
    }

    return this.reminderService
      .prepare({
        discordId: options.discordId,
        startsAt: reservation.startsAt,
        reminderMinutesBefore: reservation.reminderMinutesBefore,
      })
      .catch(() => null);
  }

  private async restoreReservationAndReminder(options: {
    reservation: Reservation & { guild: { name: string } };
    discordId: string;
    previousReminderContext: Awaited<
      ReturnType<ReservationReminderService["prepare"]>
    >;
  }): Promise<void> {
    const { reservation } = options;
    await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        startsAt: reservation.startsAt,
        endsAt: reservation.endsAt,
        comment: reservation.comment,
        reminderMinutesBefore: reservation.reminderMinutesBefore,
      },
    });
    await this.reminderService.cancel(reservation.id);
    await this.reminderService.schedule({
      context: options.previousReminderContext,
      discordId: options.discordId,
      reservationId: reservation.id,
      spotName: reservation.spotName,
      organizationName: reservation.guild.name,
      startsAt: reservation.startsAt,
    });
  }

  private async deletePersistedReservation(
    options: DeletePersistedReservationOptions,
  ): Promise<void> {
    await this.reminderService.cancel(options.reservation.id);
    await this.prisma.reservation.delete({
      where: { id: options.reservation.id },
    });
    await this.eventsPublisher.deleted({
      sourceGuildId: options.reservation.guildId,
      audienceGuildIds: options.audienceGuildIds,
      reservation: options.reservation,
      actorDiscordId: options.actorDiscordId,
    });
  }

  private async getReservationSettings(
    guildId: string,
  ): Promise<ReservationSettings> {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      select: {
        reservationMaxDurationMinutes: true,
        reservationMinDurationMinutes: true,
        reservationTimeGranularityMinutes: true,
        reservationMaxAdvanceDays: true,
        reservationActiveLimitPerSpot: true,
      },
    });

    return resolveReservationSettings(guild);
  }
}
