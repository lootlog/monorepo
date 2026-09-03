import { describe, expect, it } from "#test/bun-test";
import { normalizeReservationSpotId } from "./reservation-spot-id.js";

describe("normalizeReservationSpotId", () => {
  it.each([
    ["Potępione Zamczysko", "potepione-zamczysko"],
    ["Północna Grota", "polnocna-grota"],
    ["  Dwa   Słowa  ", "dwa-slowa"],
    ["Already-slugged", "already-slugged"],
  ])("normalizes %s", (value, expected) => {
    expect(normalizeReservationSpotId(value)).toBe(expected);
  });
});
