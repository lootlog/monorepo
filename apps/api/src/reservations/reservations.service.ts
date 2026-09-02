import { Injectable } from "@nestjs/common";
import { GuildsService } from "#src/guilds/guilds.service";
import type { MyReservationsQueryDto } from "./dto/reservation-query.dto.js";
import { MyReservationsService } from "./my-reservations.service.js";
import { ReservationCatalogService } from "./reservation-catalog.service.js";
import { ReservationReadService } from "./reservation-read.service.js";
import { ReservationSharingService } from "./reservation-sharing.service.js";
import { ReservationsRepository } from "./reservations.repository.js";

@Injectable()
export class ReservationsService extends ReservationReadService {
  private readonly mine: MyReservationsService;

  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    private readonly guildsService: GuildsService,
    catalogService: ReservationCatalogService,
    sharingService: ReservationSharingService,
  ) {
    super(reservationsRepository, catalogService, sharingService);
    this.mine = new MyReservationsService(
      this.reservationsRepository,
      this.guildsService,
    );
  }

  async listMine(options: {
    userId: string;
    discordId: string;
    query: MyReservationsQueryDto;
  }) {
    return this.mine.listMine(options);
  }
}
