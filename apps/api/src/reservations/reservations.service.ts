import { and, or } from "@prisma/orm-family-sql/orm-client";
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
import { temporalToDate, dateToTemporal } from "#src/db/temporal";

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
      this.prisma.db.orm.public.UserPinnedReservationSpot.where((row) =>
        and(row.userId.eq(context.userId), row.guildId.eq(context.guildId)),
      )
        .select("spotId")
        .all(),
    ]);
    const reservations = await this.prisma.db.orm.public.Reservation.where(
      (row) =>
        and(
          row.guildId.in(visibleGuildIds),
          row.endsAt.gt(dateToTemporal(now)),
        ),
    )
      .include("guild")
      .orderBy([(row) => row.startsAt.asc(), (row) => row.id.asc()])
      .all();
    const pinnedSpotIds = new Set(pinnedSpots.map(({ spotId }) => spotId));
    const viewer = this.toPresentationViewer(context);

    return spots.map((spot) => {
      const spotReservations = reservations.filter(
        (reservation) => reservation.spotId === spot.id,
      );
      const localSpotReservations = spotReservations.filter(
        (reservation) => reservation.guildId === context.guildId,
      );
      const currentReservation =
        localSpotReservations.find(
          (reservation) =>
            temporalToDate(reservation.startsAt) <= now &&
            temporalToDate(reservation.endsAt) > now,
        ) ?? null;
      const nextReservation =
        localSpotReservations.find(
          (reservation) => temporalToDate(reservation.startsAt) > now,
        ) ?? null;

      return {
        ...spot,
        isPinned: pinnedSpotIds.has(spot.id),
        isAvailableNow: currentReservation === null,
        availableUntil:
          currentReservation === null
            ? (nextReservation?.startsAt ?? null)
            : null,
        activeReservationCount: localSpotReservations.length,
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
    const reservations = await this.prisma.db.orm.public.Reservation.where(
      (row) =>
        and(
          row.guildId.in(visibleGuildIds),
          row.spotId.eq(spotId),
          row.startsAt.lt(dateToTemporal(to)),
          row.endsAt.gt(dateToTemporal(from)),
        ),
    )
      .include("guild")
      .orderBy([(row) => row.startsAt.asc(), (row) => row.id.asc()])
      .all();
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
    await this.prisma.db.orm.public.UserPinnedReservationSpot.where((row) =>
      and(
        row.userId.eq(userId),
        row.guildId.eq(guildId),
        row.spotId.eq(spotId),
      ),
    ).upsert({
      create: { userId, guildId, spotId },
      update: {},
    });
  }

  async unpinSpot(
    userId: string,
    guildId: string,
    spotId: string,
  ): Promise<void> {
    await this.prisma.db.orm.public.UserPinnedReservationSpot.where((row) =>
      and(
        row.userId.eq(userId),
        row.guildId.eq(guildId),
        row.spotId.eq(spotId),
      ),
    ).deleteAndCount();
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
    let reservationsQuery = this.prisma.db.orm.public.Reservation.where((row) =>
      and(
        row.guildId.in(accessibleGuilds.map((guild) => guild.id)),
        or(
          row.createdByUserId.eq(options.userId),
          row.createdBy.eq(options.discordId),
        ),
      ),
    );
    reservationsQuery =
      options.query.status === "past"
        ? reservationsQuery.where((row) =>
            and(
              row.endsAt.gte(dateToTemporal(retentionStart)),
              row.endsAt.lt(dateToTemporal(now)),
            ),
          )
        : reservationsQuery.where((row) => row.endsAt.gte(dateToTemporal(now)));
    const reservations = await reservationsQuery
      .include("guild")
      .orderBy(
        options.query.status === "past"
          ? [(row) => row.endsAt.desc(), (row) => row.id.desc()]
          : [(row) => row.startsAt.asc(), (row) => row.id.asc()],
      )
      .all();
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
