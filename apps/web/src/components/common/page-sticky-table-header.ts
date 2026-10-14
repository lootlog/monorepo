/**
 * A table header pinned to the page scroller, under the app bar on phones.
 * Headers of tables that scroll inside their own box use `sticky top-0`.
 */
export const PAGE_STICKY_TABLE_HEADER_CLASS =
  "sticky top-(--page-sticky-top) z-10 bg-background";

/**
 * A table header pinned right under the page's `FilterBar`, which publishes
 * its height to the content after it. Without a bar it pins like
 * `PAGE_STICKY_TABLE_HEADER_CLASS`.
 */
export const FILTERED_TABLE_HEADER_CLASS =
  "sticky top-[calc(var(--page-sticky-top)+var(--filter-bar-height,0px))] z-10 bg-background";
