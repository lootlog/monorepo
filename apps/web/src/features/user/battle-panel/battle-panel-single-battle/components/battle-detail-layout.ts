// Shared by the battle detail view and its skeleton so the loading state keeps the real
// geometry.

/**
 * From this width the log rail scrolls on its own beside the battle. Below it the page
 * scrolls as a whole and reads the rail last.
 */
export const BATTLE_DETAIL_WIDE_MEDIA_QUERY = "(min-width: 1280px)";

/** The details bar, then the battle and its rail. */
export const BATTLE_DETAIL_CONTENT_CLASS_NAME = "flex flex-col xl:h-full";

export const BATTLE_DETAIL_COLUMNS_CLASS_NAME =
  "flex flex-col xl:grid xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(380px,32%)] xl:grid-rows-1";

/**
 * A column of the wide layout. Below it the columns only grow with their content, but Base UI
 * still makes their viewports scroll containers, which would trap pinned bars inside them;
 * letting them overflow hands sticky positioning to the page scroller.
 */
export const BATTLE_DETAIL_COLUMN_CLASS_NAME =
  "min-w-0 xl:h-full xl:min-h-0 max-xl:[&>[data-slot=scroll-area-viewport]]:overflow-visible! [&>[data-slot=scroll-area-viewport]]:isolate";

/** The rail, ruled off from the battle beside it. */
export const BATTLE_DETAIL_RAIL_CLASS_NAME = `${BATTLE_DETAIL_COLUMN_CLASS_NAME} xl:border-l xl:border-border`;

/**
 * Under the pinned tabs, the band headings and pinned rows stick below the tabs, as page
 * content does below a filter bar.
 */
export const BATTLE_DETAIL_PANELS_UNDER_TABS_CLASS_NAME =
  "[--filter-bar-height:var(--page-tabs-height)]";

export const BATTLE_DETAIL_TABS_CLASS_NAME =
  "sticky top-(--page-sticky-top) z-30 h-(--page-tabs-height) bg-background backdrop-blur-sm";
