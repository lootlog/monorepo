import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { ListToolbarSkeleton } from "@/components/common/list-toolbar-skeleton";
import type { ComponentProps, ReactNode } from "react";
import { SettingsTabSkeleton } from "./settings-tab-skeleton";

type SettingsListSkeletonProps = {
  /** Stands in for the toolbar's controls after the filter. */
  toolbar?: ReactNode;
  tile?: ComponentProps<typeof ListTileSkeleton>;
  tiles?: number;
};

/** Route-level stand-in for a settings list: tabs, toolbar and tiles. */
export const SettingsListSkeleton = ({
  toolbar,
  tile,
  tiles = 8,
}: SettingsListSkeletonProps) => (
  <SettingsTabSkeleton>
    <ListToolbarSkeleton>{toolbar}</ListToolbarSkeleton>
    {Array.from({ length: tiles }, (_, index) => (
      <ListTileSkeleton key={index} {...tile} />
    ))}
  </SettingsTabSkeleton>
);
