export const BATTLE_DETAIL_WIDE_MEDIA_QUERY = "(width >= 80rem)";

export const BATTLE_DETAIL_CONTENT_CLASS_NAME = "flex flex-col xl:h-full";

export const BATTLE_DETAIL_COLUMNS_CLASS_NAME =
  "flex flex-col xl:grid xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(380px,32%)] xl:grid-rows-1";

export const BATTLE_DETAIL_COLUMN_CLASS_NAME =
  "min-w-0 xl:h-full xl:min-h-0 max-xl:[&>[data-slot=scroll-area-viewport]]:overflow-visible! [&>[data-slot=scroll-area-viewport]]:isolate";

export const BATTLE_DETAIL_RAIL_CLASS_NAME = `${BATTLE_DETAIL_COLUMN_CLASS_NAME} xl:border-l xl:border-border`;

export const BATTLE_DETAIL_PANELS_UNDER_TABS_CLASS_NAME =
  "[--filter-bar-height:var(--page-tabs-height)]";

export const BATTLE_DETAIL_TABS_CLASS_NAME =
  "glass-bar sticky top-(--page-sticky-top) z-30 h-(--page-tabs-height)";
