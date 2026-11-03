/**
 * The players of a loot side by side, each over their items. A phone's card
 * is narrower than ten 36px item tiles, so the row scales down there until
 * ten players fit on one line; every card is as wide, so all scale alike.
 * It sits in the loot's `@container`.
 */
export const LOOT_PLAYERS_ROW_CLASS =
  "flex min-w-0 flex-1 basis-48 flex-wrap content-start gap-x-0.75 gap-y-2.5 sm:gap-x-2 @max-[387px]:[zoom:0.9] @max-[348px]:[zoom:0.86]";
