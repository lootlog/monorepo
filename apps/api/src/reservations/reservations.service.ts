import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import { Permission, Prisma } from "src/generated/prisma/client";
import { GuildsService } from "src/guilds/guilds.service";
import type { CreateReservationDto } from "./dto/create-reservation.dto";
import type { MyReservationsQueryDto } from "./dto/reservation-query.dto";
import type { UpdateReservationDto } from "./dto/update-reservation.dto";
import { ReservationCatalogService } from "./reservation-catalog.service";
import { ReservationEventsPublisher } from "./reservation-events.publisher";
import {
  getDiscordAvatarUrl,
  presentReservation,
  type ReservationWithGuild,
} from "./reservation-presentation";
import {
  parseReservationWindow,
  validateReservationTime,
  type ReservationSettings,
} from "./reservation-policy";
import { ReservationReminderService } from "./reservation-reminder.service";
import { ReservationSharingService } from "./reservation-sharing.service";

const DEFAULT_RESERVATION_SETTINGS: ReservationSettings = {
  reservationMaxDurationMinutes: 180,
  reservationMinDurationMinutes: 30,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 3,
};

type ViewerContext = {
  guildId: string;
  userId: string;
  discordId: string;
  actorIsOwner: boolean;
  permissions: Permission[];
};

function canModerateReservations(context: ViewerContext): boolean {
  const permissions = new Set(context.permissions);
  return (
    context.actorIsOwner ||
    permissions.has(Permission.OWNER) ||
    permissions.has(Permission.ADMIN) ||
    permissions.has(Permission.LOOTLOG_MANAGE)
  );
}

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guildsService: GuildsService,
    private readonly catalogService: ReservationCatalogService,
    private readonly sharingService: ReservationSharingService,
    private readonly reminderService: ReservationReminderService,
    private readonly eventsPublisher: ReservationEventsPublisher,
  ) {}

  async listSpots(context: ViewerContext) {
    const now = new Date();
    const [spots, visibleGuildIds, pinnedSpots] = await Promise.all([
      this.catalogService.getSpots(),
      this.sharingService.getVisibleGuildIds(context.guildId),
      this.prisma.userPinnedReservationSpot.findMany({
        where: { userId: context.userId, guildId: context.guildId },
        select: { spotId: true },
      }),
    ]);
    const reservations = await this.prisma.reservation.findMany({
      where: {
        guildId: { in: visibleGuildIds },
        endsAt: { gt: now },
      },
      include: { guild: true },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    });
    const pinnedSpotIds = new Set(pinnedSpots.map(({ spotId }) => spotId));
    const viewer = this.toPresentationViewer(context);

    return spots.map((spot) => {
      const spotReservations = reservations.filter(
        (reservation) => reservation.spotId === spot.id,
      );
      const currentReservation =
        spotReservations.find(
          (reservation) =>
            reservation.startsAt <= now && reservation.endsAt > now,
        ) ?? null;
      const nextReservation =
        spotReservations.find((reservation) => reservation.startsAt > now) ??
        null;

      return {
        ...spot,
        isPinned: pinnedSpotIds.has(spot.id),
        isAvailableNow: currentReservation === null,
        availableUntil:
          currentReservation === null
            ? (nextReservation?.startsAt ?? null)
            : null,
        activeReservationCount: spotReservations.length,
        hasPartnerReservations: spotReservations.some(
          (reservation) => reservation.guildId !== context.guildId,
        ),
        currentReservation: currentReservation
          ? presentReservation(currentReservation, viewer)
          : null,
        nextReservation: nextReservation
          ? presentReservation(nextReservation, viewer)
          : null,
      };
    });
  }

  async listWindow(
    context: ViewerContext,
    spotId: string,
    fromValue: string,
    toValue: string,
  ) {
    await this.catalogService.getSpot(spotId);
    const { from, to } = parseReservationWindow(fromValue, toValue);
    const visibleGuildIds = await this.sharingService.getVisibleGuildIds(
      context.guildId,
    );
    const reservations = await this.prisma.reservation.findMany({
      where: {
        guildId: { in: visibleGuildIds },
        spotId,
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      include: { guild: true },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    });
    const viewer = this.toPresentationViewer(context);

    return {
      items: reservations.map((reservation) =>
        presentReservation(reservation, viewer),
      ),
      window: { from, to },
    };
  }

  async createReservation(options: {
    context: ViewerContext;
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

    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    validateReservationTime({ startsAt, endsAt, settings });
    const reminderMinutesBefore = data.reminderMinutesBefore ?? null;
    const reminderContext = await this.reminderService.prepare({
      discordId: context.discordId,
      startsAt,
      reminderMinutesBefore,
    });

    const created = await this.prisma.$transaction(
      async (transaction) => {
        const overlappingReservation = await transaction.reservation.findFirst({
          where: {
            guildId: { in: visibleGuildIds },
            spotId: spot.id,
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
          select: { id: true },
        });
        if (overlappingReservation) {
          throw new ConflictException({ code: "RESERVATION_OVERLAP" });
        }

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
            startsAt,
            endsAt,
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
        startsAt,
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

    return presentReservation(created, this.toPresentationViewer(context));
  }

  async deleteReservation(options: {
    context: ViewerContext;
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

    const isMine =
      reservation.createdByUserId === context.userId ||
      reservation.legacyCreatedByDiscordId === context.discordId;
    const canModerateSource =
      reservation.guildId === context.guildId &&
      canModerateReservations(context);
    if (!isMine && !canModerateSource) {
      throw new ForbiddenException({ code: "RESERVATION_DELETE_FORBIDDEN" });
    }

    await this.reminderService.cancel(reservation.id);
    await this.prisma.reservation.delete({ where: { id: reservation.id } });
    await this.eventsPublisher.deleted({
      sourceGuildId: reservation.guildId,
      audienceGuildIds: visibleGuildIds,
      reservation,
      actorDiscordId: reservation.legacyCreatedByDiscordId ?? context.discordId,
    });
  }

  async pinSpot(
    userId: string,
    guildId: string,
    spotId: string,
  ): Promise<void> {
    await this.catalogService.getSpot(spotId);
    await this.prisma.userPinnedReservationSpot.upsert({
      where: { userId_guildId_spotId: { userId, guildId, spotId } },
      create: { userId, guildId, spotId },
      update: {},
    });
  }

  async unpinSpot(
    userId: string,
    guildId: string,
    spotId: string,
  ): Promise<void> {
    await this.prisma.userPinnedReservationSpot.deleteMany({
      where: { userId, guildId, spotId },
    });
  }

  async listMine(options: {
    userId: string;
    discordId: string;
    query: MyReservationsQueryDto;
  }) {
    const accessibleGuilds =
      await this.guildsService.getCurrentUserAccessibleGuilds(
        options.discordId,
        options.userId,
      );
    const now = new Date();
    const retentionStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const statusFilter =
      options.query.status === "past"
        ? { endsAt: { gte: retentionStart, lt: now } }
        : { endsAt: { gte: now } };
    const reservations = await this.prisma.reservation.findMany({
      where: {
        guildId: { in: accessibleGuilds.map((guild) => guild.id) },
        ...statusFilter,
        OR: [
          { createdByUserId: options.userId },
          { legacyCreatedByDiscordId: options.discordId },
        ],
      },
      include: { guild: true },
      orderBy:
        options.query.status === "past"
          ? [{ endsAt: "desc" }, { id: "desc" }]
          : [{ startsAt: "asc" }, { id: "asc" }],
    });
    const viewer = {
      guildId: null,
      userId: options.userId,
      discordId: options.discordId,
      canModerateCurrentGuild: false,
    };
    return {
      items: reservations.map((reservation) =>
        presentReservation(reservation, viewer),
      ),
    };
  }

  async updateMine(options: {
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

    const startsAt = options.data.startsAt
      ? new Date(options.data.startsAt)
      : reservation.startsAt;
    const endsAt = options.data.endsAt
      ? new Date(options.data.endsAt)
      : reservation.endsAt;
    const comment =
      options.data.comment === undefined
        ? reservation.comment
        : options.data.comment || null;
    const reminderMinutesBefore =
      options.data.reminderMinutesBefore === undefined
        ? reservation.reminderMinutesBefore
        : options.data.reminderMinutesBefore;
    const timeChanged =
      startsAt.getTime() !== reservation.startsAt.getTime() ||
      endsAt.getTime() !== reservation.endsAt.getTime();
    const reminderChanged =
      reminderMinutesBefore !== reservation.reminderMinutesBefore;
    const reminderNeedsReschedule = timeChanged || reminderChanged;

    const [settings, visibleGuildIds] = await Promise.all([
      this.getReservationSettings(reservation.guildId),
      this.sharingService.getVisibleGuildIds(reservation.guildId),
    ]);
    if (timeChanged) {
      validateReservationTime({
        startsAt,
        endsAt,
        settings,
        allowPastStart: startsAt.getTime() === reservation.startsAt.getTime(),
      });
    }

    const reminderContext = reminderNeedsReschedule
      ? await this.reminderService.prepare({
          discordId: options.discordId,
          startsAt,
          reminderMinutesBefore,
        })
      : null;
    const previousReminderScheduledFor =
      reservation.reminderMinutesBefore === null
        ? null
        : new Date(
            reservation.startsAt.getTime() -
              reservation.reminderMinutesBefore * 60_000,
          );
    const previousReminderContext =
      reminderNeedsReschedule &&
      reservation.reminderMinutesBefore !== null &&
      previousReminderScheduledFor &&
      previousReminderScheduledFor.getTime() > Date.now()
        ? await this.reminderService
            .prepare({
              discordId: options.discordId,
              startsAt: reservation.startsAt,
              reminderMinutesBefore: reservation.reminderMinutesBefore,
            })
            .catch(() => null)
        : null;

    const updated = await this.prisma.$transaction(
      async (transaction) => {
        if (timeChanged) {
          const overlappingReservation =
            await transaction.reservation.findFirst({
              where: {
                id: { not: reservation.id },
                guildId: { in: visibleGuildIds },
                spotId: reservation.spotId,
                startsAt: { lt: endsAt },
                endsAt: { gt: startsAt },
              },
              select: { id: true },
            });
          if (overlappingReservation) {
            throw new ConflictException({ code: "RESERVATION_OVERLAP" });
          }
        }

        return transaction.reservation.update({
          where: { id: reservation.id },
          data: {
            startsAt,
            endsAt,
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
          context: previousReminderContext,
          discordId: options.discordId,
          reservationId: reservation.id,
          spotName: reservation.spotName,
          organizationName: reservation.guild.name,
          startsAt: reservation.startsAt,
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

  async deleteMine(options: {
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
    await this.reminderService.cancel(reservation.id);
    await this.prisma.reservation.delete({ where: { id: reservation.id } });
    await this.eventsPublisher.deleted({
      sourceGuildId: reservation.guildId,
      audienceGuildIds,
      reservation,
      actorDiscordId: reservation.legacyCreatedByDiscordId ?? options.discordId,
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

    return guild ?? DEFAULT_RESERVATION_SETTINGS;
  }

  private toPresentationViewer(context: ViewerContext) {
    return {
      guildId: context.guildId,
      userId: context.userId,
      discordId: context.discordId,
      canModerateCurrentGuild: canModerateReservations(context),
    };
  }
}

export type { ViewerContext };
export type { ReservationWithGuild };
