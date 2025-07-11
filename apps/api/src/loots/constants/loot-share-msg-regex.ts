export const LOOT_SHARE_NICK_REGEX =
  /([\p{L}0-9 .,'-]+?) otrzymał ((?:ITEM#[a-f0-9]+:"[^"]+",?\s?)+)/gu;
export const LOOT_SHARE_ITEM_REGEX = /ITEM#([a-f0-9]+):"([^"]+)"/g;
export const LOOT_SHARE_MSG_REGEX =
  /([\p{L}0-9 .,'-]+?)(?: otrzyma[ła]{1,2}| - [^()]+)? ?\(?ITEM#([a-f0-9]+):"([^"]+)"\)?/gu;
