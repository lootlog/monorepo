import type { ReservationSpotsResponseDto } from "@lootlog/client/main";
import type { ReservationFilter } from "./reservation-filters";

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
  const normalizedSearch = searchValue.trim().toLocaleLowerCase("pl");

  return spots
    .filter(
      (spot) =>
        spot.name.toLocaleLowerCase("pl").includes(normalizedSearch) &&
        matchesFilter(spot, filter),
    )
    .sort((left, right) => {
      if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
      return (
        right.level - left.level || left.name.localeCompare(right.name, "pl")
      );
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
