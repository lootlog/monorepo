import { ListTileSkeleton } from "@/components/common/list-tile-skeleton";
import { ListToolbarSkeleton } from "@/components/common/list-toolbar-skeleton";
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
    <ListToolbarSkeleton>{toolbar}</ListToolbarSkeleton>
    {Array.from({ length: tiles }, (_, index) => (
      <ListTileSkeleton key={index} {...tile} />
    ))}
  </SettingsTabSkeleton>
);
