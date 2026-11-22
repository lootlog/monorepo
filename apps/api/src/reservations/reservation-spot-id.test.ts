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
    ["Straße Æsir Øre Œuvre", "stra-e-sir-re-uvre"],
    ["Łowca-Smoków_2 (II)", "lowca-smokow-2-ii"],
  ])("normalizes %s", (value, expected) => {
    expect(normalizeReservationSpotId(value)).toBe(expected);
  });
});
