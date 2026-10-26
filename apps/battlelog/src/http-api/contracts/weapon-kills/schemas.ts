/** Transport definitions for weapon kill counters. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "@lootlog/schema/http-scalars";
import { CreateBattleDto } from "../battles/creation.schemas.js";

const MargonemIdDto = Schema.String.check(
  Schema.isPattern(/^\d{1,20}$/).annotate({
    expected: "a Margonem identifier of up to 20 digits",
  }),
);

export type RecordWeaponKillsDto = typeof RecordWeaponKillsDto.Type;

export const RecordWeaponKillsDto = Schema.Struct({
  characterId: MargonemIdDto,
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(64).annotate({
      expected: "a value with a length of at most 64",
    }),
  ),
  weaponItemId: MargonemIdDto,
  events: CreateBattleDto.fields.events,
}).annotate({ identifier: "RecordWeaponKillsDto" });

export type WeaponKillsDto_Output = typeof WeaponKillsDto_Output.Type;

export const WeaponKillsDto_Output = Schema.Struct({
  itemId: Schema.String,
  kills: FiniteNumber,
}).annotate({ identifier: "WeaponKillsDto_Output" });

export type CharacterWeaponKillsResponseDto_Output =
  typeof CharacterWeaponKillsResponseDto_Output.Type;

export const CharacterWeaponKillsResponseDto_Output = Schema.Struct({
  weapons: Schema.Array(WeaponKillsDto_Output),
}).annotate({ identifier: "CharacterWeaponKillsResponseDto_Output" });

export type WeaponKillsControllerGetCharacterWeaponKillsPathParams =
  typeof WeaponKillsControllerGetCharacterWeaponKillsPathParams.Type;

export const WeaponKillsControllerGetCharacterWeaponKillsPathParams =
  Schema.Struct({
    world: Schema.String,
    characterId: MargonemIdDto,
  });
