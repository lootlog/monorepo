import type { ViewMode } from "@/hooks/use-view-mode";

export function getReservationCollectionClassName(viewMode: ViewMode) {
  if (viewMode === "list") return "flex flex-col gap-3 px-3 pb-3";

  return "grid grid-cols-1 gap-3 px-3 pb-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";
}
