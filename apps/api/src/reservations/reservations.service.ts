import { Injectable } from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import { GuildsService } from "#src/guilds/guilds.service";
import type { MyReservationsQueryDto } from "./dto/reservation-query.dto.js";
import { ReservationCatalogService } from "./reservation-catalog.service.js";
import { presentReservation } from "./reservation-presentation.js";
import { parseReservationWindow } from "./reservation-policy.js";
import { ReservationSharingService } from "./reservation-sharing.service.js";
import {
  canModerateReservations,
  type ReservationViewerContext,
} from "./reservation-viewer.js";

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guildsService: GuildsService,
    private readonly catalogService: ReservationCatalogService,
    private readonly sharingService: ReservationSharingService,
  ) {}

  async listSpots(context: ReservationViewerContext) {
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
    context: ReservationViewerContext,
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

  private toPresentationViewer(context: ReservationViewerContext) {
    return {
      guildId: context.guildId,
      userId: context.userId,
      discordId: context.discordId,
      canModerateCurrentGuild: canModerateReservations(context),
    };
  }
}
