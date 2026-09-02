import type { GuildAccessSummaryService } from "#src/guilds/guild-access-summary.service";
import type { MyReservationsQueryDto } from "./dto/reservation-query.dto.js";
import { presentReservation } from "./reservation-presentation.js";
import type { ReservationsRepository } from "./reservations.repository.js";

const RETENTION_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;

export class MyReservationsService {
  constructor(
    private readonly repository: ReservationsRepository,
    private readonly guildAccess: Pick<
      GuildAccessSummaryService,
      "getCurrentUserAccessibleGuilds"
    >,
  ) {}

  async listMine(options: {
    userId: string;
    discordId: string;
    query: MyReservationsQueryDto;
  }) {
    const accessibleGuilds =
      await this.guildAccess.getCurrentUserAccessibleGuilds(
        options.discordId,
        options.userId,
      );
    const now = new Date();
    const reservations = await this.repository.findMine({
      guildIds: accessibleGuilds.map((guild) => guild.id),
      userId: options.userId,
      discordId: options.discordId,
      status: options.query.status,
      now,
      retentionStart: new Date(now.getTime() - RETENTION_MILLISECONDS),
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
