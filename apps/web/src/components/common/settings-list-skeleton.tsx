import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { FilterBar } from "@/components/common/filter-bar";
import { InlineSearchFieldSkeleton } from "@/components/common/inline-search-field-skeleton";
import type { ComponentProps, ReactNode } from "react";
import { SettingsTabSkeleton } from "@/components/common/settings-tab-skeleton";

type SettingsListSkeletonProps = {
  toolbar?: ReactNode;
  tile?: ComponentProps<typeof ListTileSkeleton>;
  tiles?: number;
};

export const SettingsListSkeleton = ({
  toolbar,
  tile,
  tiles = 8,
}: SettingsListSkeletonProps) => (
  <SettingsTabSkeleton>
    <FilterBar search={<InlineSearchFieldSkeleton />}>{toolbar}</FilterBar>
    {Array.from({ length: tiles }, (_, index) => (
      <ListTileSkeleton key={index} {...tile} />
    ))}
  </SettingsTabSkeleton>
);
