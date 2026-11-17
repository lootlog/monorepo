import { describe, expect, it } from "bun:test";
import { normalizeReservationSpotId } from "./reservation-spot-id.js";

describe("normalizeReservationSpotId", () => {
  it.each([
    ["Potępione Zamczysko", "potepione-zamczysko"],
    ["Północna Grota", "polnocna-grota"],
    ["  Dwa   Słowa  ", "dwa-slowa"],
    ["Already-slugged", "already-slugged"],
    ["Zażółć gęślą jaźń", "zazolc-gesla-jazn"],
    ["ĄĆĘŁŃÓŚŹŻ", "acelnoszz"],
    // Spot ids are stored, so letters NFD keeps whole other than ł stay
    // separators, as they always were.
    ["Straße Æsir Øre Œuvre", "stra-e-sir-re-uvre"],
    ["Łowca-Smoków_2 (II)", "lowca-smokow-2-ii"],
  ])("normalizes %s", (value, expected) => {
    expect(normalizeReservationSpotId(value)).toBe(expected);
  });
});
