import { Injectable } from "@nestjs/common";
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
import { ReservationsRepository } from "./reservations.repository.js";

@Injectable()
export class ReservationsService {
  constructor(
    private readonly repository: ReservationsRepository,
    private readonly guildsService: GuildsService,
    private readonly catalogService: ReservationCatalogService,
    private readonly sharingService: ReservationSharingService,
  ) {}

  async listSpots(context: ReservationViewerContext) {
    const now = new Date();
    const [spots, visibleGuildIds, pinnedSpots] = await Promise.all([
      this.catalogService.getSpots(),
      this.sharingService.getVisibleGuildIds(context.guildId),
      this.repository.findPinnedSpotIds(context.userId, context.guildId),
    ]);
    const reservations = await this.repository.findUpcoming(
      visibleGuildIds,
      now,
    );
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
            reservation.startsAt <= now && reservation.endsAt > now,
        ) ?? null;
      const nextReservation =
        localSpotReservations.find(
          (reservation) => reservation.startsAt > now,
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
    const reservations = await this.repository.findWindow(
      visibleGuildIds,
      spotId,
      from,
      to,
    );
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
    await this.repository.pinSpot(userId, guildId, spotId);
  }

  async unpinSpot(
    userId: string,
    guildId: string,
    spotId: string,
  ): Promise<void> {
    await this.repository.unpinSpot(userId, guildId, spotId);
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
    const reservations = await this.repository.findMine({
      guildIds: accessibleGuilds.map((guild) => guild.id),
      userId: options.userId,
      discordId: options.discordId,
      status: options.query.status,
      now,
      retentionStart,
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
