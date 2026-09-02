import { normalizeReservationSpotId } from "./reservation-spot-id.js";

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

const unique = (values: string[]): string[] => [
  ...new Set(values.filter(Boolean)),
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseCard = (value: unknown): ReservationCatalogCard => {
  if (!isRecord(value)) throw new Error("Invalid reservation catalog card");
  const coercedLevel = Number(value.lvl);
  return {
    lvl: Number.isInteger(coercedLevel) && coercedLevel >= 0 ? coercedLevel : 0,
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
};

export const parseReservationCatalogPayload = (
  payload: unknown,
): ReservationSpot[] => {
  const decoded =
    typeof payload === "string" ? (JSON.parse(payload) as unknown) : payload;
  const record =
    isRecord(decoded) && isRecord(decoded.data) ? decoded.data : decoded;
  if (!isRecord(record)) throw new Error("Invalid reservation catalog payload");
  const spots = Object.entries(record).map(([name, entry]) => {
    const cards = (Array.isArray(entry) ? entry : [entry]).map(parseCard);
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
    uniqueSpots.set(
      spot.id,
      existing
        ? {
            ...existing,
            level: Math.max(existing.level, spot.level),
            images: unique([...existing.images, ...spot.images]),
            maps: unique([...existing.maps, ...spot.maps]),
          }
        : spot,
    );
  }
  if (uniqueSpots.size === 0) {
    throw new Error("Reservation catalog contains no valid spots");
  }
  return [...uniqueSpots.values()];
};
