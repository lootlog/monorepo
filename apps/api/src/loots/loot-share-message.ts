import { Schema } from "effect";

const MAX_PLAYER_NAME_LENGTH = 100;

const MAX_ITEM_HEX_ID_LENGTH = 64;

const MAX_ITEM_NAME_LENGTH = 200;

const LOOT_SHARE_MSG_REGEX = new RegExp(
  `(?<player>[\\p{L}0-9 .,'-]{1,${MAX_PLAYER_NAME_LENGTH}}?) otrzyma(?:ł|ła) (?<items>(?:ITEM#[a-f0-9]{1,${MAX_ITEM_HEX_ID_LENGTH}}:"[^"]{1,${MAX_ITEM_NAME_LENGTH}}"[,\\s]*)+)`,
  "gu",
);

const LOOT_SHARE_ITEM_REGEX = new RegExp(
  `ITEM#(?<hid>[a-f0-9]{1,${MAX_ITEM_HEX_ID_LENGTH}}):"[^"]{1,${MAX_ITEM_NAME_LENGTH}}"`,
  "g",
);

const matchAllGroups = <S extends Schema.Decoder<unknown>>(
  pattern: RegExp,
  groups: S,
) => {
  const decodeGroups = Schema.decodeUnknownSync(groups);

  return (text: string) =>
    Array.from(text.matchAll(pattern), (match) => decodeGroups(match.groups));
};

export const matchLootShares = matchAllGroups(
  LOOT_SHARE_MSG_REGEX,
  Schema.Struct({ player: Schema.String, items: Schema.String }),
);

export const matchLootShareItems = matchAllGroups(
  LOOT_SHARE_ITEM_REGEX,
  Schema.Struct({ hid: Schema.String }),
);
