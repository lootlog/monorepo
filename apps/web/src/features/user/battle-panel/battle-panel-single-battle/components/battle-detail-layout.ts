import { cn } from "cn";

// Shared by the battle detail view and its skeleton so the loading state keeps the real geometry.

export const getBattleDetailContentClassName = ({
  isGroup,
}: {
  isGroup: boolean;
}) =>
  cn(
    "flex flex-col gap-3 p-3 xl:grid xl:h-full xl:grid-rows-1",
    // Group statistics are a ten-column table, so they take width from the battle column.
    isGroup
      ? "xl:grid-cols-[minmax(380px,0.75fr)_minmax(0,1.4fr)]"
      : "xl:grid-cols-[minmax(420px,1fr)_minmax(0,1fr)]",
  );

/**
 * From this width the battle and the panels are two independently scrolling columns. Below
 * it the page scrolls as a whole and the log becomes one of the tabbed panels.
 */
export const BATTLE_DETAIL_WIDE_MEDIA_QUERY = "(min-width: 1280px)";

/** Overview, chart and, in the wide layout, the log that the chart navigates. */
export const BATTLE_DETAIL_BATTLE_COLUMN_CLASS_NAME =
  "@container min-w-0 xl:h-full xl:min-h-0 [&>[data-slot=scroll-area-viewport]]:isolate";

export const BATTLE_DETAIL_BATTLE_CONTENT_CLASS_NAME = "flex flex-col gap-3";

// The pinned chart also covers the gap below it, so the log never shows through while scrolling.
// Without a chart the slot still pins the log's rounded cap to the top of the column.
export const BATTLE_DETAIL_EMPTY_PIN_SLOT_CLASS_NAME =
  "xl:sticky xl:top-0 xl:z-30 xl:-mb-3 xl:h-0";

// Once the log's header scrolls away, its square search bar meets the pinned chart. This cap
// hangs below the chart and redraws the card's rounded top edge over it; while the header is
// still in place the cap coincides with the card's own corners and is invisible.
export const BATTLE_DETAIL_LOG_CAP_CLASS_NAME =
  "pointer-events-none absolute inset-x-0 top-full hidden h-4 overflow-hidden xl:block";

// Taller than the cap, so only its rounded top shows; the spread shadow paints the page
// background outside the corners.
export const BATTLE_DETAIL_LOG_CAP_EDGE_CLASS_NAME =
  "h-8 rounded-t-2xl border border-b-0 border-border shadow-[0_0_0_1rem_var(--background)]";

export const BATTLE_DETAIL_CHART_SLOT_CLASS_NAME =
  "bg-background xl:sticky xl:top-0 xl:z-30 xl:-mb-3 xl:pb-3";

// The viewport is its own stacking context, so the pinned tabs stay below the column's
// scrollbar, which is a sibling of the viewport.
export const BATTLE_DETAIL_PANELS_COLUMN_CLASS_NAME =
  "min-w-0 xl:h-full xl:min-h-0 [&>[data-slot=scroll-area-viewport]]:isolate";

export const BATTLE_DETAIL_PANELS_CONTENT_CLASS_NAME = "flex flex-col gap-3";

// The pinned tabs also cover the gap below them, so cards never show through while scrolling.
// Panel cards isolate their own sticky cells, so this only has to beat plain content.
export const BATTLE_DETAIL_TABS_SLOT_CLASS_NAME =
  "bg-background xl:sticky xl:top-0 xl:z-30 xl:-mb-3 xl:pb-3";

// The pinned tabs are a fixed-height toggle group plus the gap they cover. Panels that pin
// their own header, such as the statistics table, stick right below this line.
export const BATTLE_DETAIL_PANELS_PIN_TOP_CLASS_NAME =
  "xl:[--battle-detail-pin-top:48px]";

// Sticks once the statistics card reaches the pinned tabs and redraws the card's rounded top
// edge there, because the card's pinned header is square. It sits outside the card, so it
// can paint the page background outside the corners.
export const BATTLE_DETAIL_STATS_CAP_SLOT_CLASS_NAME =
  "pointer-events-none z-20 -mb-3 hidden h-0 xl:sticky xl:top-(--battle-detail-pin-top,0px) xl:block";

export const BATTLE_DETAIL_STATS_CAP_CLASS_NAME =
  "absolute inset-x-0 top-0 h-4 overflow-hidden";
