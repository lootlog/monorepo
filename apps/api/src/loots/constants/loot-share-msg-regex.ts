export const LOOT_SHARE_NICK_REGEX =
  /([\p{L}0-9 .,'-]+?) otrzymał ((?:ITEM#[a-f0-9]+:"[^"]+",?\s?)+)/gu;
export const LOOT_SHARE_ITEM_REGEX = /ITEM#([a-f0-9]+):"([^"]+)"/g;
