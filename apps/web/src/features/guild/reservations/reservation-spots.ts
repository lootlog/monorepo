import type { ReservationSpotsResponseDto } from "@lootlog/client/main";
import { comparePolish } from "@lootlog/domain/locale";
import { normalizeSearchText } from "@lootlog/domain/text-fold";

export const RESERVATION_FILTERS = [
  "all",
  "available",
  "pinned",
  "partners",
] as const;

export type ReservationFilter = (typeof RESERVATION_FILTERS)[number];

type ReservationSpot = ReservationSpotsResponseDto[number];

const matchesFilter = (
  spot: ReservationSpot,
  filter: ReservationFilter,
): boolean => {
  if (filter === "available") return spot.isAvailableNow;

  if (filter === "pinned") return spot.isPinned;

  if (filter === "partners") return spot.hasPartnerReservations;

  return true;
};

export function getVisibleReservationSpots(
  spots: ReservationSpotsResponseDto,
  searchValue: string,
  filter: ReservationFilter,
): ReservationSpotsResponseDto {
  const normalizedSearch = normalizeSearchText(searchValue);

  return spots
    .filter(
      (spot) =>
        normalizeSearchText(spot.name).includes(normalizedSearch) &&
        matchesFilter(spot, filter),
    )
    .sort((left, right) => {
      if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;

      return right.level - left.level || comparePolish(left.name, right.name);
    });
}

export function setReservationSpotPinned(
  spots: ReservationSpotsResponseDto | undefined,
  spotId: string,
  isPinned: boolean,
): ReservationSpotsResponseDto | undefined {
  return spots?.map((spot) =>
    spot.id === spotId ? { ...spot, isPinned } : spot,
  );
}
