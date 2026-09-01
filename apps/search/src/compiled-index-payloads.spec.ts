import { z, type ZodType } from "zod";
import {
  compiledIndexItemsPayloadSchema,
  indexItemsPayloadSchema,
} from "./items/dto/index-items.dto.js";
import {
  compiledIndexNpcsPayloadSchema,
  indexNpcsPayloadSchema,
} from "./npcs/dto/index-npcs.dto.js";
import {
  compiledIndexPlayersPayloadSchema,
  indexPlayersPayloadSchema,
} from "./players/dto/index-players.dto.js";

const normalizeResult = (schema: ZodType, input: unknown) => {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, issues: result.error.issues };
};

const schemaCases = [
  {
    name: "items",
    schema: indexItemsPayloadSchema,
    compiledSchema: compiledIndexItemsPayloadSchema,
    validInput: [
      {
        id: 1,
        name: "Miecz",
        icon: "miecz.gif",
        stat: "dmg=10",
        lvl: 100,
        rarity: "HEROIC",
        type: "weapon",
      },
    ],
    invalidInput: [{ id: "invalid" }],
  },
  {
    name: "players",
    schema: indexPlayersPayloadSchema,
    compiledSchema: compiledIndexPlayersPayloadSchema,
    validInput: [
      {
        id: "player-1",
        name: "Łowca",
        lvl: 100,
        prof: "h",
        icon: "hunter.gif",
        characterId: 1,
        accountId: 2,
        world: "fobos",
      },
    ],
    invalidInput: [{ id: 1 }],
  },
  {
    name: "npcs",
    schema: indexNpcsPayloadSchema,
    compiledSchema: compiledIndexNpcsPayloadSchema,
    validInput: [
      {
        id: 1,
        prof: null,
        icon: "npc.gif",
        name: "Heros",
        lvl: 100,
        wt: 80,
        type: "HERO",
        margonemType: 2,
        world: "fobos",
      },
    ],
    invalidInput: [{ id: "invalid" }],
  },
] as const;

describe("compiled search index schemas", () => {
  it.each(schemaCases)("preserves $name parsing behavior", (schemaCase) => {
    const strictCompiledSchema = z.compile(schemaCase.schema, { strict: true });
    expect(strictCompiledSchema).not.toBe(schemaCase.schema);

    const inputWithExtraField = [
      { ...schemaCase.validInput[0], ignored: "value" },
    ];

    for (const input of [
      schemaCase.validInput,
      schemaCase.invalidInput,
      inputWithExtraField,
    ]) {
      expect(normalizeResult(schemaCase.compiledSchema, input)).toEqual(
        normalizeResult(schemaCase.schema, input),
      );
    }
  });
});
