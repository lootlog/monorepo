import { z, type ZodType } from "zod";
import {
  CompiledLootCreateEventV2Schema,
  CompiledLootShareUpdateEventV2Schema,
  LootCreateEventV2Schema,
  LootShareUpdateEventV2Schema,
} from "./loot-event.dto.js";
import {
  CompiledReservationChangedEventV2Schema,
  ReservationChangedEventV2Schema,
} from "./reservation-event.dto.js";

const normalizeResult = (schema: ZodType, input: unknown) => {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, issues: result.error.issues };
};

const lootInput = {
  version: 2,
  guildId: "guild-1",
  lootId: 42,
  npcs: [{ lvl: 100, prof: "w", type: 2, wt: 80 }],
};

const schemaCases = [
  {
    name: "loot create",
    schema: LootCreateEventV2Schema,
    compiledSchema: CompiledLootCreateEventV2Schema,
    validInput: lootInput,
    invalidInput: { ...lootInput, lootId: "invalid" },
  },
  {
    name: "loot share update",
    schema: LootShareUpdateEventV2Schema,
    compiledSchema: CompiledLootShareUpdateEventV2Schema,
    validInput: { ...lootInput, lootShare: { player1: ["item1"] } },
    invalidInput: { ...lootInput, lootShare: { player1: [1] } },
  },
  {
    name: "reservation change",
    schema: ReservationChangedEventV2Schema,
    compiledSchema: CompiledReservationChangedEventV2Schema,
    validInput: {
      version: 2,
      action: "updated",
      sourceGuildId: "guild-1",
      audienceGuildIds: ["guild-1", "guild-2"],
      reservationId: 42,
      spotId: "spot-1",
    },
    invalidInput: {
      version: 2,
      action: "invalid",
      sourceGuildId: "guild-1",
      audienceGuildIds: [],
      reservationId: 42,
      spotId: "spot-1",
    },
  },
] as const;

describe("compiled gateway event schemas", () => {
  it.each(schemaCases)("preserves $name parsing behavior", (schemaCase) => {
    const strictCompiledSchema = z.compile(schemaCase.schema, { strict: true });
    expect(strictCompiledSchema).not.toBe(schemaCase.schema);

    for (const input of [
      schemaCase.validInput,
      schemaCase.invalidInput,
      { ...schemaCase.validInput, ignored: "value" },
    ]) {
      expect(normalizeResult(schemaCase.compiledSchema, input)).toEqual(
        normalizeResult(schemaCase.schema, input),
      );
    }
  });
});
