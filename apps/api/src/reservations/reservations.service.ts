import { Injectable } from "@nestjs/common";
import { GuildsService } from "#src/guilds/guilds.service";
import type { MyReservationsQueryDto } from "./dto/reservation-query.dto.js";
import { presentReservation } from "./reservation-presentation.js";
import { ReservationCatalogService } from "./reservation-catalog.service.js";
import { ReservationReadService } from "./reservation-read.service.js";
import { ReservationSharingService } from "./reservation-sharing.service.js";
import { ReservationsRepository } from "./reservations.repository.js";

@Injectable()
export class ReservationsService extends ReservationReadService {
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    private readonly guildsService: GuildsService,
    catalogService: ReservationCatalogService,
    sharingService: ReservationSharingService,
  ) {
    super(reservationsRepository, catalogService, sharingService);
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
    const reservations = await this.reservationsRepository.findMine({
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
}
