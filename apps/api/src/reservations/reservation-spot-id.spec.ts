import { describe, expect, it } from "vitest";
import { normalizeReservationSpotId } from "./reservation-spot-id";

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
