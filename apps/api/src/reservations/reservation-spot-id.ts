import { slug } from "@lootlog/domain/text-fold";

export function normalizeReservationSpotId(value: string): string {
  return slug(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[łŁ]/g, (letter) => (letter === "ł" ? "l" : "L")),
  );
}
