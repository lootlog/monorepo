import {
  columnVisibilityFeature,
  createExpandedRowModel,
  createSortedRowModel,
  rowExpandingFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";

export const coreTableFeatures = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
});

export const sortingTableFeatures = coreTableFeatures;

export const sortedTableFeatures = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

export const expandingTableFeatures = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  rowExpandingFeature,
  expandedRowModel: createExpandedRowModel(),
});
