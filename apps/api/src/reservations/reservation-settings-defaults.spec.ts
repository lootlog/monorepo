import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_RESERVATION_SETTINGS } from "@lootlog/reservations";

describe("Reservation settings defaults", () => {
  it("keeps TypeScript fallbacks aligned with persisted Guild defaults", () => {
    const prismaSchema = readFileSync(
      new URL("../../test/fixtures/prisma7/schema.prisma", import.meta.url),
      "utf8",
    );

    for (const [field, value] of Object.entries(DEFAULT_RESERVATION_SETTINGS)) {
      expect(prismaSchema).toMatch(
        new RegExp(`${field}\\s+Int\\s+@default\\(${value}\\)`),
      );
    }
  });
});
