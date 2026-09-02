import { NotFoundException } from "#src/shared/http/http-errors";
import { Effect } from "effect";
import { RedisService } from "#src/redis/redis.service";
import { env } from "#src/config/env";
import { normalizeReservationSpotId } from "./reservation-spot-id.js";

const RESERVATION_CATALOG_CACHE_KEY = "reservations:catalog:v2";
const RESERVATION_CATALOG_CACHE_TTL_SECONDS = 60 * 60;

type ReservationCatalogCard = {
  readonly lvl: number;
  readonly images: string[];
  readonly maps: string[];
};

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

export class ReservationCatalogService {
  constructor(private readonly redis: RedisService) {}

  getSpots(): Promise<ReservationSpot[]> {
    return this.redis.getOrSetJsonBestEffort({
      key: RESERVATION_CATALOG_CACHE_KEY,
      ttlSeconds: RESERVATION_CATALOG_CACHE_TTL_SECONDS,
      onError: (error) =>
        Effect.runSync(
          Effect.logWarning("Reservation catalog cache unavailable").pipe(
            Effect.annotateLogs({ error }),
          ),
        ),
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
    const response = await fetch(env.RESERVATIONS_CARDS_URL);
    if (!response.ok) {
      throw new Error(`Reservation catalog request failed: ${response.status}`);
    }
    const entries = this.parsePayload(await response.json());

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

  private parsePayload(
    payload: unknown,
  ): Record<string, ReservationCatalogCard | ReservationCatalogCard[]> {
    const decoded = this.decodePayload(payload);
    const record =
      this.isRecord(decoded) && this.isRecord(decoded.data)
        ? decoded.data
        : decoded;
    if (!this.isRecord(record)) {
      throw new Error("Invalid reservation catalog payload");
    }

    return Object.fromEntries(
      Object.entries(record).map(([name, entry]) => [
        name,
        Array.isArray(entry)
          ? entry.map((card) => this.parseCard(card))
          : this.parseCard(entry),
      ]),
    );
  }

  private parseCard(value: unknown): ReservationCatalogCard {
    if (!this.isRecord(value)) {
      throw new Error("Invalid reservation catalog card");
    }
    const coercedLevel = Number(value.lvl);
    return {
      lvl:
        Number.isInteger(coercedLevel) && coercedLevel >= 0 ? coercedLevel : 0,
      images:
        Array.isArray(value.images) &&
        value.images.every((item): item is string => typeof item === "string")
          ? value.images
          : [],
      maps:
        Array.isArray(value.maps) &&
        value.maps.every((item): item is string => typeof item === "string")
          ? value.maps
          : [],
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
