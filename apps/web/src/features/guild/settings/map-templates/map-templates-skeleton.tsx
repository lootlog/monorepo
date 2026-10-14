import { Skeleton } from "@lootlog/ui/components/skeleton";
import { SettingsListSkeleton } from "../components/settings-list-skeleton";

export const MapTemplatesSkeleton = () => (
  <SettingsListSkeleton
    toolbar=<Skeleton className="h-8 w-33.5 rounded-lg" />
    tile={{ actions: 2 }}
    tiles={4}
  />
);
