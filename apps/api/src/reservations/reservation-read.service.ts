import { ReservationCatalogService } from "./reservation-catalog.service.js";
import { presentReservation } from "./reservation-presentation.js";
import { parseReservationWindow } from "./reservation-policy.js";
import { ReservationSharingService } from "./reservation-sharing.service.js";
import {
  canModerateReservations,
  type ReservationViewerContext,
} from "./reservation-viewer.js";
import { ReservationsRepository } from "./reservations.repository.js";

export class ReservationReadService {
  constructor(
    private readonly repository: ReservationsRepository,
    private readonly catalog: ReservationCatalogService,
    private readonly sharing: ReservationSharingService,
  ) {}

  async listSpots(context: ReservationViewerContext) {
    const now = new Date();
    const [spots, visibleGuildIds, pinnedSpots] = await Promise.all([
      this.catalog.getSpots(),
      this.sharing.getVisibleGuildIds(context.guildId),
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
      const localReservations = spotReservations.filter(
        (reservation) => reservation.guildId === context.guildId,
      );
      const currentReservation =
        localReservations.find(
          (reservation) =>
            reservation.startsAt <= now && reservation.endsAt > now,
        ) ?? null;
      const nextReservation =
        localReservations.find((reservation) => reservation.startsAt > now) ??
        null;

      return {
        ...spot,
        isPinned: pinnedSpotIds.has(spot.id),
        isAvailableNow: currentReservation === null,
        availableUntil:
          currentReservation === null
            ? (nextReservation?.startsAt ?? null)
            : null,
        activeReservationCount: localReservations.length,
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
    await this.catalog.getSpot(spotId);
    const { from, to } = parseReservationWindow(fromValue, toValue);
    const visibleGuildIds = await this.sharing.getVisibleGuildIds(
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

  async pinSpot(userId: string, guildId: string, spotId: string) {
    await this.catalog.getSpot(spotId);
    await this.repository.pinSpot(userId, guildId, spotId);
  }

  unpinSpot(userId: string, guildId: string, spotId: string) {
    return this.repository.unpinSpot(userId, guildId, spotId);
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
