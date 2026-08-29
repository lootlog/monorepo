import { HttpService } from "@nestjs/axios";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import { z } from "zod";
import { lastValueFrom } from "rxjs";
import { env } from "#src/config/env";
import { normalizeReservationSpotId } from "./reservation-spot-id.js";

const RESERVATION_CATALOG_CACHE_KEY = "reservations:catalog:v2";
const RESERVATION_CATALOG_CACHE_TTL_SECONDS = 60 * 60;

const ReservationCatalogCardSchema = z.object({
  lvl: z.coerce.number().int().nonnegative().catch(0),
  images: z.array(z.string()).catch([]),
  maps: z.array(z.string()).catch([]),
});

const ReservationCatalogEntrySchema = z.union([
  ReservationCatalogCardSchema,
  z.array(ReservationCatalogCardSchema),
]);

const ReservationCatalogRecordSchema = z.record(
  z.string(),
  ReservationCatalogEntrySchema,
);

const ReservationCatalogPayloadSchema = z.union([
  ReservationCatalogRecordSchema,
  z.object({ data: ReservationCatalogRecordSchema }),
]);

export type ReservationSpot = {
  id: string;
  name: string;
  level: number;
  images: string[];
  maps: string[];
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

@Injectable()
export class ReservationCatalogService {
  private readonly logger = new Logger(ReservationCatalogService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly redis: RedisService,
  ) {}

  getSpots(): Promise<ReservationSpot[]> {
    return this.redis.getOrSetJsonBestEffort({
      key: RESERVATION_CATALOG_CACHE_KEY,
      ttlSeconds: RESERVATION_CATALOG_CACHE_TTL_SECONDS,
      onError: (error) =>
        this.logger.warn("Reservation catalog cache unavailable", error),
      factory: () => this.fetchSpots(),
    });
  }

  async getSpot(spotId: string): Promise<ReservationSpot> {
    const spots = await this.getSpots();
    const spot = spots.find((candidate) => candidate.id === spotId);

    if (!spot) {
      throw new NotFoundException({ code: "RESERVATION_SPOT_NOT_FOUND" });
    }

    return spot;
  }

  private async fetchSpots(): Promise<ReservationSpot[]> {
    const response = await lastValueFrom(
      this.httpService.get<unknown>(env.RESERVATIONS_CARDS_URL),
    );
    const decodedPayload = this.decodePayload(response.data);
    const parsedPayload = ReservationCatalogPayloadSchema.parse(decodedPayload);
    const entries =
      "data" in parsedPayload ? parsedPayload.data : parsedPayload;

    const spots = Object.entries(entries).map(([name, rawCards]) => {
      const cards = Array.isArray(rawCards) ? rawCards : [rawCards];

      return {
        id: normalizeReservationSpotId(name),
        name,
        level: Math.max(0, ...cards.map((card) => card.lvl)),
        images: unique(cards.flatMap((card) => card.images)),
        maps: unique(cards.flatMap((card) => card.maps)),
      } satisfies ReservationSpot;
    });

    const uniqueSpots = new Map<string, ReservationSpot>();
    for (const spot of spots) {
      const existing = uniqueSpots.get(spot.id);
      if (!existing) {
        uniqueSpots.set(spot.id, spot);
        continue;
      }

      uniqueSpots.set(spot.id, {
        ...existing,
        level: Math.max(existing.level, spot.level),
        images: unique([...existing.images, ...spot.images]),
        maps: unique([...existing.maps, ...spot.maps]),
      });
    }

    if (uniqueSpots.size === 0) {
      throw new Error("Reservation catalog contains no valid spots");
    }

    return [...uniqueSpots.values()];
  }

  private decodePayload(payload: unknown): unknown {
    if (typeof payload !== "string") {
      return payload;
    }

    return JSON.parse(payload) as unknown;
  }
}
