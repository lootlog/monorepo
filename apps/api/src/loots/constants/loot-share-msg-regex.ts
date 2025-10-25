const MAX_PLAYER_NAME_LENGTH = 100;
const MAX_ITEM_HEX_ID_LENGTH = 64;
const MAX_ITEM_NAME_LENGTH = 200;

export const LOOT_SHARE_NICK_REGEX = new RegExp(
  `([\\p{L}0-9 .,'-]{1,${MAX_PLAYER_NAME_LENGTH}}?) otrzymał ((?:ITEM#[a-f0-9]{1,${MAX_ITEM_HEX_ID_LENGTH}}:"[^"]{1,${MAX_ITEM_NAME_LENGTH}}"[,\\s]*)+)`,
  'gu',
);

export const LOOT_SHARE_MSG_REGEX = new RegExp(
  `([\\p{L}0-9 .,'-]{1,${MAX_PLAYER_NAME_LENGTH}}?) otrzyma(?:ł|ła) ((?:ITEM#[a-f0-9]{1,${MAX_ITEM_HEX_ID_LENGTH}}:"[^"]{1,${MAX_ITEM_NAME_LENGTH}}"[,\\s]*)+)`,
  'gu',
);

export const LOOT_SHARE_ITEM_REGEX = new RegExp(
  `ITEM#([a-f0-9]{1,${MAX_ITEM_HEX_ID_LENGTH}}):"[^"]{1,${MAX_ITEM_NAME_LENGTH}}"`,
  'g',
);
