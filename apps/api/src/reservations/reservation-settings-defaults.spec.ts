import { describe, expect, it } from "bun:test";
import { DEFAULT_RESERVATION_SETTINGS } from "@lootlog/domain/reservations";
import { getTableColumns } from "drizzle-orm";
import { guildTable } from "../database/drizzle/schema.js";

describe("Reservation settings defaults", () => {
  it("keeps TypeScript fallbacks aligned with persisted Guild defaults", () => {
    const columns = getTableColumns(guildTable);

    for (const [field, value] of Object.entries(DEFAULT_RESERVATION_SETTINGS)) {
      expect(
        Object.entries(columns).find(([name]) => name === field)?.[1].default,
      ).toBe(value);
    }
  });
});
