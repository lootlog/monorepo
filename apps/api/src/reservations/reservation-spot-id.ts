import { slug } from "@lootlog/domain/text-fold";

/**
 * Spot ids are stored, so they keep their original folding instead of
 * `foldText`: only the marks U+0300–U+036F and ł are folded, and the other
 * letters NFD keeps whole (ß, æ, ø, œ) stay separators.
 */
export function normalizeReservationSpotId(value: string): string {
  return slug(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[łŁ]/g, (letter) => (letter === "ł" ? "l" : "L")),
  );
}
