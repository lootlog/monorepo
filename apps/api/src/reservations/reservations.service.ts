import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { PrismaService } from "src/db/prisma.service";
import type { CreateReservationDto } from "./dto/create-reservation.dto";
import { Permission, type Prisma } from "src/generated/prisma/client";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";
import { RedisService } from "@lootlog/nest-shared";
import { HttpService } from "@nestjs/axios";
import { env } from "src/config/env";
import { lastValueFrom } from "rxjs";

type ReservationRecord = {
  id: number;
  reservationId: string;
  createdDate: Date;
  fromDate: Date;
  toDate: Date;
  createdBy: string;
  comment?: string | null;
};

type ReservationCard = {
  lvl: number;
  images: string[];
  maps: string[];
};

type ReservationsCardsPayload = Record<
  string,
  ReservationCard | ReservationCard[] | undefined
>;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
    private readonly redis: RedisService,
    private readonly httpService: HttpService,
  ) {}

  private async deleteExpiredReservations(guildId: string) {
    const monthAgoDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.prisma.reservation.deleteMany({
      where: {
        guildId,
        toDate: { lt: monthAgoDate },
      },
    });
    return monthAgoDate;
  }

  private normalizeReservationsCards(input: ReservationsCardsPayload) {
    const result: Record<string, ReservationCard[]> = {};

    Object.entries(input ?? {}).forEach(([key, value]) => {
      if (!value) {
        return;
      }

      const cards = Array.isArray(value) ? value : [value];
      const sanitized = cards
        .map((card) => ({
          lvl: Number(card.lvl) || 0,
          images: Array.isArray(card.images) ? card.images.filter(Boolean) : [],
          maps: Array.isArray(card.maps) ? card.maps.filter(Boolean) : [],
        }))
        .filter(
          (card) =>
            card.lvl > 0 || card.images.length > 0 || card.maps.length > 0,
        );

      if (sanitized.length > 0) {
        result[key] = sanitized;
      }
    });

    return result;
  }

  private mapReservationRecord(reservation: ReservationRecord) {
    const { id, reservationId, createdDate, fromDate, toDate, createdBy } =
      reservation;

    return {
      id,
      reservationId,
      createdDate,
      fromDate,
      toDate,
      createdBy,
      comment: reservation.comment,
    } satisfies ReservationRecord;
  }

  private serializeReservationRecord(reservation: ReservationRecord) {
    return {
      id: reservation.id,
      reservationId: reservation.reservationId,
      createdDate: reservation.createdDate.toISOString(),
      fromDate: reservation.fromDate.toISOString(),
      toDate: reservation.toDate.toISOString(),
      createdBy: reservation.createdBy,
      comment: reservation.comment ?? null,
    };
  }

  private emitReservationEvent(
    guildId: string,
    reservation: ReservationRecord,
    routingKey: RoutingKey,
  ) {
    const payload = {
      guildId,
      reservation: this.serializeReservationRecord(reservation),
    };

    this.amqpConnection.publish(DEFAULT_EXCHANGE_NAME, routingKey, payload);
  }

  async createReservation(guildId: string, data: CreateReservationDto) {
    const incomingFrom = new Date(data.fromDate).getTime();
    const incomingTo = new Date(data.toDate).getTime();

    if (Number.isNaN(incomingFrom) || Number.isNaN(incomingTo)) {
      throw new BadRequestException("Nieprawidłowy zakres czasowy rezerwacji.");
    }

    const now = Date.now();
    const maxPastOffsetMs = 60 * 60 * 1000; // 1 hour
    if (incomingFrom < now - maxPastOffsetMs) {
      throw new BadRequestException(
        "Godzina rozpoczęcia rezerwacji nie może być starsza niż 1 godzina od aktualnego czasu.",
      );
    }

    if (incomingFrom >= incomingTo) {
      throw new BadRequestException(
        "Data zakończenia musi być późniejsza niż rozpoczęcia.",
      );
    }

    const minimumDurationMs = 30 * 60 * 1000;
    if (incomingTo - incomingFrom < minimumDurationMs) {
      throw new BadRequestException(
        "Rezerwacja musi trwać co najmniej 30 minut.",
      );
    }

    await this.deleteExpiredReservations(guildId);

    const overlappingReservation = await this.prisma.reservation.findFirst({
      where: {
        guildId,
        reservationId: data.reservationId,
        NOT: {
          OR: [
            { toDate: { lte: data.fromDate } },
            { fromDate: { gte: data.toDate } },
          ],
        },
      },
    });

    if (overlappingReservation) {
      throw new BadRequestException(
        "Istnieje już inna rezerwacja w podanym przedziale czasowym.",
      );
    }

    const createPayload: Prisma.ReservationUncheckedCreateInput = {
      guildId,
      reservationId: data.reservationId,
      createdDate: data.createdDate,
      fromDate: data.fromDate,
      toDate: data.toDate,
      createdBy: data.createdBy,
      ...(data.comment !== undefined ? { comment: data.comment } : {}),
    };

    const created = await this.prisma.reservation.create({
      data: createPayload,
    });

    const record = this.mapReservationRecord(created);
    this.emitReservationEvent(
      guildId,
      record,
      RoutingKey.GUILDS_RESERVATIONS_CREATE,
    );

    return record;
  }

  async getReservationsCards() {
    const cacheKey = `reservations:cards`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ReservationsCardsPayload;
        const normalized = this.normalizeReservationsCards(parsed);
        if (Object.keys(normalized).length > 0) {
          return normalized;
        }
        await this.redis.del(cacheKey);
      } catch {
        await this.redis.del(cacheKey);
      }
    }

    const externalUrl = env.RESERVATIONS_CARDS_URL;

    const response = await lastValueFrom(
      this.httpService.get<unknown>(externalUrl),
    );

    const rawPayload = response.data;

    let decodedPayload: unknown;
    if (typeof rawPayload === "string") {
      try {
        decodedPayload = JSON.parse(rawPayload);
      } catch {
        throw new Error("Nie udało się zdekodować danych kart rezerwacji.");
      }
    } else {
      decodedPayload = rawPayload;
    }

    const payload = decodedPayload as
      | { data?: ReservationsCardsPayload }
      | ReservationsCardsPayload
      | undefined;

    const data =
      (payload as { data?: ReservationsCardsPayload })?.data ??
      (payload as ReservationsCardsPayload) ??
      undefined;

    if (!data) {
      throw new Error("Brak danych kart rezerwacji z zewnętrznego serwisu.");
    }

    const normalized = this.normalizeReservationsCards(data);

    if (Object.keys(normalized).length === 0) {
      throw new Error("Brak kart rezerwacji po przetworzeniu odpowiedzi.");
    }

    await this.redis.set(cacheKey, JSON.stringify(normalized), 60 * 60);

    return normalized;
  }
  async getReservations(guildId: string) {
    const monthAgoDate = await this.deleteExpiredReservations(guildId);

    const reservations = (await this.prisma.reservation.findMany({
      where: {
        guildId,
        toDate: { gte: monthAgoDate },
      },
      orderBy: [{ reservationId: "asc" }, { fromDate: "asc" }],
    })) as ReservationRecord[];

    return reservations.reduce<Record<string, ReservationRecord[]>>(
      (accumulator, reservation) => {
        const list =
          accumulator[reservation.reservationId] ??
          (accumulator[reservation.reservationId] = []);

        list.push(this.mapReservationRecord(reservation));

        return accumulator;
      },
      {},
    );
  }

  async clearReservations(guildId: string) {
    await this.prisma.reservation.deleteMany({
      where: { guildId },
    });
  }

  async deleteReservation(options: {
    guildId: string;
    reservationRecordId: number;
    actorDiscordId: string;
    actorIsOwner: boolean;
    permissions: Permission[];
  }) {
    const {
      guildId,
      reservationRecordId,
      actorDiscordId,
      actorIsOwner,
      permissions,
    } = options;

    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: reservationRecordId,
        guildId,
      },
    });

    if (!reservation) {
      throw new NotFoundException("Nie znaleziono rezerwacji.");
    }

    const permissionsSet = new Set(permissions);
    const canModerate =
      actorIsOwner ||
      permissionsSet.has(Permission.LOOTLOG_MANAGE) ||
      permissionsSet.has(Permission.ADMIN);

    if (!canModerate && reservation.createdBy !== actorDiscordId) {
      throw new ForbiddenException("Nie możesz usunąć tej rezerwacji.");
    }

    await this.prisma.reservation.delete({
      where: { id: reservation.id },
    });

    const record = this.mapReservationRecord(reservation);
    this.emitReservationEvent(
      guildId,
      record,
      RoutingKey.GUILDS_RESERVATIONS_DELETE,
    );

    return record;
  }
}
